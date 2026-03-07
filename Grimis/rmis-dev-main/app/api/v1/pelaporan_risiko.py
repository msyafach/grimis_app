from fastapi import APIRouter, Depends, HTTPException, Response, Query
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import Spacer
from reportlab.lib.units import inch
from reportlab.lib import colors
from pydantic import BaseModel
from io import BytesIO
from fastapi.responses import StreamingResponse
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill

from app.database import Database
from app.utils.auth import get_current_user, get_current_user_from_token
from app.schemas.user import UserRole
from app.utils.pdf_generator import (
    create_pdf_buffer, create_document, get_styles,
    create_paragraph, add_page_number, create_table,
    generate_pdf_response
)
from app.api.v1.analisis_risiko import calculate_risk_level, get_selera_risiko, calculate_memenuhi

router = APIRouter()

class InstansiResponse(BaseModel):
    id: str
    nama_instansi: str

class IndukUnitKerjaResponse(BaseModel):
    id: str
    nama_induk_unit: str

@router.get("/instansi", response_model=List[InstansiResponse])
async def get_instansi_list(
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of institutions the user has access to.
    
    Returns:
    - List of institutions with ID and name
    """
    db = await Database.get_db()
    
    # SUPER_ADMIN can access all institutions
    if current_user["role"] == UserRole.SUPER_ADMIN:
        instansi_list = []
        async for instansi in db.instansi.find({}):
            instansi_list.append({
                "id": str(instansi["_id"]),
                "nama_instansi": instansi["nama_instansi"]
            })
        return instansi_list
    
    # For other roles, check assigned institution
    if "assigned_instansi" in current_user and current_user["assigned_instansi"]:
        instansi_id = current_user["assigned_instansi"].get("id")
        if instansi_id:
            instansi = await db.instansi.find_one({"_id": ObjectId(instansi_id)})
            if instansi:
                return [{
                    "id": str(instansi["_id"]),
                    "nama_instansi": instansi["nama_instansi"]
                }]
    
    # Return empty list if no access
    return []

@router.get("/induk-unit-kerja/{id_instansi}", response_model=List[IndukUnitKerjaResponse])
async def get_induk_unit_kerja_list(
    id_instansi: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of ALL parent work units in an institution, regardless of user assignment.
    
    Parameters:
    - id_instansi: Institution ID
    
    Returns:
    - List of all parent work units with ID and name
    """
    db = await Database.get_db()
    
    # Validate user has access to this institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        # Cek di database untuk user ini
        user_id = current_user["id"]
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        
        # Periksa jika pengguna memiliki akses ke instansi ini
        if user_data and user_data.get("instansi_id") != id_instansi:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this institution's data"
            )
    
    # Get ALL parent work units for this institution, regardless of user assignment
    induk_unit_list = []
    async for induk_unit in db.induk_unit_kerja.find({"id_instansi": id_instansi}):
        induk_unit_list.append({
            "id": str(induk_unit["_id"]),
            "nama_induk_unit": induk_unit["nama_induk_unit"]
        })
    
    # Add "All Units" option
    induk_unit_list.insert(0, {
        "id": "all",
        "nama_induk_unit": "Semua Unit Kerja"
    })
    
    return induk_unit_list

def get_risk_level_color(level):
    """Get color based on risk level."""
    if level >= 20:  # Extreme/Merah
        return colors.red
    elif level >= 16:  # High/Merah Muda
        return colors.pink
    elif level >= 10:  # Medium/Kuning
        return colors.yellow
    else:  # Low/Hijau
        return colors.lightgreen

def generate_excel(identifikasi_list, tahun, instansi_name, unit_name, show_unit_column=False):
    """
    Generate Excel file from risk identification data
    
    Args:
        identifikasi_list: List of risk identification items
        tahun: Year of the report
        instansi_name: Name of the institution
        unit_name: Name of the unit (if applicable)
        show_unit_column: Whether to show the unit column
        
    Returns:
        BytesIO: Excel file buffer
    """
    output = BytesIO()
    
    # Create workbook and worksheet
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = f"Risk Register {tahun}"
    
    # Add title and metadata
    sheet['A1'] = "RISK REGISTER"
    sheet['A2'] = instansi_name
    sheet['A3'] = unit_name or "Semua Unit Kerja"
    sheet['A4'] = f"Tahun {tahun}"
    
    # Style the header - make it match the PDF styling
    title_font = Font(size=18, bold=True)
    subtitle_font = Font(size=14, bold=True)
    centered = Alignment(horizontal='center')
    
    # Apply styles to header cells
    sheet['A1'].font = title_font
    sheet['A1'].alignment = centered
    sheet.merge_cells('A1:E1')  # Merge cells for main title
    
    sheet['A2'].font = subtitle_font
    sheet['A2'].alignment = centered
    sheet.merge_cells('A2:E2')  # Merge cells for institution name
    
    sheet['A3'].font = subtitle_font
    sheet['A3'].alignment = centered
    sheet.merge_cells('A3:E3')  # Merge cells for unit name
    
    sheet['A4'].font = subtitle_font
    sheet['A4'].alignment = centered
    sheet.merge_cells('A4:E4')  # Merge cells for year
    
    # Add more vertical spacing before table
    start_row = 7
    
    # Define headers
    headers = ["Strategic Objective & Indicator", "Business Process", "Risk ID", "Risk Statement", "Risk Level (Heatmap)"]
    if show_unit_column:
        headers.insert(0, "Unit Kerja")
        # Update merged cell ranges if we have an extra column
        sheet.unmerge_cells('A1:E1')
        sheet.unmerge_cells('A2:E2')
        sheet.unmerge_cells('A3:E3')
        sheet.unmerge_cells('A4:E4')
        sheet.merge_cells('A1:F1')
        sheet.merge_cells('A2:F2')
        sheet.merge_cells('A3:F3')
        sheet.merge_cells('A4:F4')
    
    # Add headers to sheet - use the same blue color as PDF (#336699)
    for col, header in enumerate(headers, start=1):
        cell = sheet.cell(row=start_row, column=col)
        cell.value = header
        cell.font = Font(bold=True, color="FFFFFF")  # White text
        cell.fill = PatternFill(start_color="336699", end_color="336699", fill_type="solid")
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    # Set appropriate row height for header row
    sheet.row_dimensions[start_row].height = 40
    
    # Auto-adjust column widths - do this early to help with row height calculations
    column_widths = [20, 30, 20, 15, 40, 15] if show_unit_column else [30, 20, 15, 40, 15]
    for i, width in enumerate(column_widths, start=1):
        sheet.column_dimensions[chr(64 + i)].width = width
    
    # Helper function to convert reportlab Color to Excel hex format
    def to_excel_color(color):
        # Get RGB values from reportlab Color object (0-1 scale)
        red = int(color.red * 255)
        green = int(color.green * 255)
        blue = int(color.blue * 255)
        # Convert to Excel hex format (RRGGBB)
        return f"{red:02X}{green:02X}{blue:02X}"
    
    # Helper function to estimate row height based on text and column width
    def estimate_row_height(text, col_width, chars_per_line=6):
        """
        Estimate row height based on text length and column width
        
        Args:
            text: Text content
            col_width: Column width in Excel units
            chars_per_line: Average characters per Excel width unit
            
        Returns:
            Estimated height in points
        """
        if not text:
            return 15  # Default minimum height
            
        # Estimate the number of lines
        chars_per_full_line = col_width * chars_per_line
        text_length = len(str(text))
        
        # Calculate estimated lines with extra buffer
        estimated_lines = max(1, (text_length / chars_per_full_line) * 1.5) if chars_per_full_line > 0 else 1
        
        # Each line is approximately 15 points high
        return min(250, max(45, 15 * estimated_lines))
    
    # Add data rows
    row = start_row + 1
    
    # Track which rows will have risk level colors
    risk_level_cells = {}
    
    # First pass - add data and store risk level cells for coloring
    for item in identifikasi_list:
        col = 1
        row_heights = []
        
        # Define the text wrapping alignment for content cells
        wrap_alignment = Alignment(vertical='top', wrap_text=True)
        center_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        if show_unit_column:
            cell = sheet.cell(row=row, column=col)
            cell.value = item["unit_kerja"]
            cell.alignment = wrap_alignment
            row_heights.append(estimate_row_height(item["unit_kerja"], column_widths[col-1]))
            col += 1
            
        cell = sheet.cell(row=row, column=col)
        cell.value = item["strategic_objective"]
        cell.alignment = wrap_alignment
        row_heights.append(estimate_row_height(item["strategic_objective"], column_widths[col-1]))
        col += 1
        
        cell = sheet.cell(row=row, column=col)
        cell.value = item["business_process"]
        cell.alignment = wrap_alignment
        row_heights.append(estimate_row_height(item["business_process"], column_widths[col-1]))
        col += 1
        
        cell = sheet.cell(row=row, column=col)
        cell.value = item["risk_id"]
        cell.alignment = center_alignment
        col += 1
        
        cell = sheet.cell(row=row, column=col)
        cell.value = item["risk_statement"]
        cell.alignment = wrap_alignment
        row_heights.append(estimate_row_height(item["risk_statement"], column_widths[col-1], 5))  # Risk statement needs more space
        col += 1
        
        risk_level_cell = sheet.cell(row=row, column=col)
        risk_level_cell.value = item["risk_level"]
        risk_level_cell.alignment = center_alignment
        
        # Get color directly from the reportlab color object
        risk_level_color = item["risk_level_color"]
        color_code = to_excel_color(risk_level_color)
        
        # Store for later application
        risk_level_cells[(row, col)] = color_code
        
        # Set row height based on content (use max height of all cells in the row)
        # Add extra buffer for safety
        max_row_height = max(row_heights) if row_heights else 45
        sheet.row_dimensions[row].height = max_row_height
            
        row += 1
    
    # Apply zebra striping for better readability
    # BUT don't override cells that have risk level colors
    for row in range(start_row + 1, sheet.max_row + 1):
        if row % 2 == 0:  # Even rows
            for col in range(1, len(headers) + 1):
                if (row, col) not in risk_level_cells:  # Only apply if not a risk level cell
                    sheet.cell(row=row, column=col).fill = PatternFill(
                        start_color="F2F2F2", 
                        end_color="F2F2F2", 
                        fill_type="solid"
                    )
    
    # Now apply risk level colors (AFTER zebra striping to ensure they take precedence)
    for (row, col), color_code in risk_level_cells.items():
        sheet.cell(row=row, column=col).fill = PatternFill(
            start_color=color_code,
            end_color=color_code,
            fill_type="solid"
        )
    
    # Add border to all cells in data range
    thin_border = Border(
        left=Side(style='thin'), 
        right=Side(style='thin'), 
        top=Side(style='thin'), 
        bottom=Side(style='thin')
    )
    
    for row in range(start_row, sheet.max_row + 1):
        for col in range(1, len(headers) + 1):
            sheet.cell(row=row, column=col).border = thin_border
    
    # Add subtle borders to title sections
    for row in range(1, 5):
        for col in range(1, len(headers) + 1):
            sheet.cell(row=row, column=col).border = Border(
                bottom=Side(style='thin', color="DDDDDD")
            )
    
    workbook.save(output)
    output.seek(0)
    return output

async def get_identifikasi_data(db, tahun, id_instansi, id_induk_unit_kerja):
    """
    Collect and process risk identification data for reports
    Returns processed data for both PDF and Excel formats
    """
    # Build query for identifikasi_risiko
    query = {
        "tahun": tahun,
        "id_instansi": id_instansi
    }
    
    # Add filter for specific unit if not "all"
    if id_induk_unit_kerja and id_induk_unit_kerja != "all":
        query["id_induk_unit_kerja"] = id_induk_unit_kerja
    
    # Get instansi name for the report title
    instansi = await db.instansi.find_one({"_id": ObjectId(id_instansi)})
    instansi_name = instansi.get("nama_instansi", "Unknown Institution") if instansi else "Unknown Institution"
    
    # Get induk_unit_kerja name if provided and not "all"
    unit_name = ""
    if id_induk_unit_kerja and id_induk_unit_kerja != "all":
        unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(id_induk_unit_kerja)})
        unit_name = unit.get("nama_induk_unit", "") if unit else ""
    
    # Fetch data
    identifikasi_list = []
    
    async for identifikasi in db.identifikasi_risiko.find(query):
        try:
            # Get related data
            konteks_sasaran = await db.konteks.find_one({"_id": ObjectId(identifikasi.get("id_konteks_sasaran", ""))})
            konteks_probis = await db.konteks.find_one({"_id": ObjectId(identifikasi.get("id_konteks_probis", ""))})
            indikator = await db.indikator.find_one({"_id": ObjectId(identifikasi.get("id_indikator", ""))})
            
            # Get kode risiko from kamus_risiko
            kode_risiko = ""
            kamus_risiko = await db.kamus_risiko.find_one({"nama": identifikasi.get("pernyataan_risiko", ""), "id_instansi": id_instansi})
            if kamus_risiko:
                kode_risiko = kamus_risiko.get("kode", "")
            
            # Get risk level from analisis_risiko
            risk_level = 0
            risk_level_text = "N/A"
            risk_level_color = colors.white
            
            analisis = await db.analisis_risiko.find_one({
                "identifikasi_risiko_id": str(identifikasi["_id"]),
                "tahun": tahun
            })
            
            if analisis:
                # First, count attachments to help with residual risk calculation
                attachment_count = await db.attachments.count_documents({
                    "$or": [
                        {"ref_id": str(analisis["_id"]), "type": {"$regex": "^PENGENDALIAN"}},
                        {"id_analisis_risiko": str(analisis["_id"]), "type": {"$regex": "^PENGENDALIAN"}},
                        {"analisis_risiko_id": str(analisis["_id"]), "type": {"$regex": "^PENGENDALIAN"}}
                    ]
                })
                
                # Get selera_risiko for risk level evaluation
                selera_risiko = await get_selera_risiko(db, str(identifikasi["_id"]))
                
                # Use cascading priority for risk level: Actual > Treated > Residual > Inherent
                if analisis.get("skor_kemungkinan_actual", 0) > 0 and analisis.get("skor_dampak_actual", 0) > 0:
                    # Recalculate actual risk level
                    risk_level = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_actual", 0)),
                        float(analisis.get("skor_dampak_actual", 0))
                    )
                    risk_level_text = f"{risk_level} (Actual)"
                elif analisis.get("skor_kemungkinan_treated", 0) > 0 and analisis.get("skor_dampak_treated", 0) > 0:
                    # Recalculate treated risk level
                    risk_level = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_treated", 0)),
                        float(analisis.get("skor_dampak_treated", 0))
                    )
                    risk_level_text = f"{risk_level} (Treated)"
                elif analisis.get("skor_kemungkinan_residual", 0) > 0 and analisis.get("skor_dampak_residual", 0) > 0:
                    # For residual risk, check if there are attachments for calculation
                    skor_kemungkinan_residual = float(analisis.get("skor_kemungkinan_residual", 0))
                    skor_dampak_residual = float(analisis.get("skor_dampak_residual", 0))
                    
                    if attachment_count > 0:
                        # Recalculate residual risk level
                        risk_level = await calculate_risk_level(
                            skor_kemungkinan_residual, 
                            skor_dampak_residual
                        )
                    else:
                        # If no attachments, use stored level if available
                        stored_level = analisis.get("level_risiko_residual", 0)
                        risk_level = stored_level if stored_level > 0 else 0
                    
                    risk_level_text = f"{risk_level} (Residual)"
                else:
                    # Recalculate inherent risk level
                    risk_level = await calculate_risk_level(
                        float(analisis.get("skor_kemungkinan_inherit", 0)),
                        float(analisis.get("skor_dampak_inherit", 0))
                    )
                    risk_level_text = f"{risk_level} (Inherent)"
                
                risk_level_color = get_risk_level_color(risk_level)
            
            # Get unit name for this item if we're showing all units
            item_unit_name = ""
            if id_induk_unit_kerja == "all" and "id_induk_unit_kerja" in identifikasi:
                unit = await db.induk_unit_kerja.find_one({"_id": ObjectId(identifikasi["id_induk_unit_kerja"])})
                if unit:
                    item_unit_name = unit.get("nama_induk_unit", "")
            
            # Create strategic objective with indicator
            strategic_objective = konteks_sasaran.get("nama", "") if konteks_sasaran else ""
            if indikator:
                strategic_objective = f"{strategic_objective} [{indikator.get('nama', '')}]"
            
            # Create report item
            item = {
                "id": str(identifikasi["_id"]),
                "strategic_objective": strategic_objective,
                "business_process": konteks_probis.get("nama", "") if konteks_probis else "",
                "risk_id": kode_risiko,
                "risk_statement": identifikasi.get("pernyataan_risiko", ""),
                "risk_level": risk_level_text,
                "risk_level_color": risk_level_color,
                "unit_kerja": item_unit_name
            }
            
            identifikasi_list.append(item)
        except Exception as e:
            # Skip items with missing data
            continue
            
    return {
        "identifikasi_list": identifikasi_list,
        "instansi_name": instansi_name,
        "unit_name": unit_name,
        "show_unit_column": id_induk_unit_kerja == "all"
    }

@router.get("/identifikasi-risiko")
async def download_identifikasi_risiko_report(
    tahun: int,
    id_instansi: str,
    id_induk_unit_kerja: Optional[str] = None,
    format: str = Query("pdf", description="Export format: 'pdf' or 'excel'"),
    token: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate and download a report of risk identification data in PDF or Excel format.
    
    Parameters:
    - tahun: Year of the risk identification data
    - id_instansi: Institution ID
    - id_induk_unit_kerja: Optional parent work unit ID to filter results (use "all" for all units)
    - format: Output format (pdf or excel)
    - token: Optional token for authentication when downloading directly
    
    Returns:
    - File download (PDF or Excel) containing risk identification report
    """
    db = await Database.get_db()
    
    # If token is provided, use it instead of the current_user from header
    if token:
        try:
            current_user = await get_current_user_from_token(token)
        except HTTPException as e:
            raise e
    
    # Validate user has access to this institution
    if current_user["role"] != UserRole.SUPER_ADMIN:
        # Cek di database untuk user ini
        user_id = current_user["id"]
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        
        # Periksa jika pengguna memiliki akses ke instansi ini
        if user_data and user_data.get("instansi_id") != id_instansi:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this institution's data"
            )
    
    # Get data for the report
    data = await get_identifikasi_data(db, tahun, id_instansi, id_induk_unit_kerja)
    
    # Check if we have data
    if not data["identifikasi_list"]:
        # Instead of raising an exception, we'll continue with an empty list
        # This allows for a report with headers but no data
        print(f"No data found, generating empty report for tahun={tahun}, instansi={id_instansi}")
    
    # Generate report based on requested format
    if format.lower() == "excel":
        # Generate Excel
        excel_buffer = generate_excel(
            data["identifikasi_list"],
            tahun,
            data["instansi_name"],
            data["unit_name"],
            data["show_unit_column"]
        )
        
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="Risk_Register_{tahun}.xlsx"'
            }
        )
    else:
        # Generate PDF report using the PDF generator utilities
        buffer = create_pdf_buffer()
        
        # Create PDF document
        doc = create_document(buffer, landscape_mode=True)
        
        # Get styles
        styles = get_styles()
        
        # Create content elements
        elements = []
        
        # Add title and subtitle
        elements.append(create_paragraph("Risk Register", styles['title']))
        
        # Add institution, unit and year info as separate lines
        elements.append(create_paragraph(data["instansi_name"], styles['subtitle']))
        
        unit_display_name = data["unit_name"] or "Semua Unit Kerja"
        if id_induk_unit_kerja == "all":
            unit_display_name = "Semua Unit Kerja"
        elements.append(create_paragraph(unit_display_name, styles['subtitle']))
        
        elements.append(create_paragraph(f"Tahun {tahun}", styles['subtitle']))

        elements.append(Spacer(1, 0.2 * inch))
        
        # Create table data - add Unit Kerja column if showing all units
        headers = ["Strategic Objective & Indicator", "Business Process", "Risk ID", "Risk Statement", "Risk Level\n(Heatmap)"]
        if data["show_unit_column"]:
            headers.insert(0, "Unit Kerja")  # Add Unit Kerja at the beginning
        
        table_data = [headers]
        
        # Define table style with colored cells for risk levels and more user-friendly design
        table_style = [
            # Header styling - more modern look
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#336699")),  # Modern blue header
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Content styling
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            
            # Grid styling - more subtle
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            
            # Ensure text wrapping in header
            ('WORDWRAP', (0, 0), (-1, 0), True),
        ]
        
        # Add alternating row colors for better readability
        for i in range(1, len(table_data)):
            if i % 2 == 0:  # Even rows
                table_style.append(('BACKGROUND', (0, i), (-1, i), colors.whitesmoke))
        
        # Add data rows
        for i, item in enumerate(data["identifikasi_list"], 1):
            row = [
                create_paragraph(item["strategic_objective"], styles['left']),
                create_paragraph(item["business_process"], styles['left']),
                create_paragraph(item["risk_id"], styles['left']),
                create_paragraph(item["risk_statement"], styles['left']),
                create_paragraph(item["risk_level"], styles['center'])
            ]
            
            # Insert unit name if showing all units
            if data["show_unit_column"]:
                row.insert(0, create_paragraph(item["unit_kerja"], styles['left']))
            
            table_data.append(row)
            
            # Add background color for risk level cell
            risk_level_col = len(row) - 1  # Last column is risk level
            table_style.append(('BACKGROUND', (risk_level_col, i), (risk_level_col, i), item["risk_level_color"]))
        
        # Define column widths - adjust for all units case
        if data["show_unit_column"]:
            col_widths = [0.15, 0.25, 0.20, 0.08, 0.22, 0.10]  # With Unit Kerja column
        else:
            col_widths = [0.30, 0.20, 0.10, 0.30, 0.10]  # Without Unit Kerja column
        
        # Create table with specific style
        available_width = landscape(A4)[0] - 60  # Total width minus margins
        table = create_table(table_data, col_widths, available_width, table_style)
        
        # Add table to elements
        elements.append(table)
        
        # Build PDF with page number and date in footer
        doc.build(
            elements,
            onFirstPage=lambda canvas, doc: add_page_number(canvas, doc),
            onLaterPages=lambda canvas, doc: add_page_number(canvas, doc)
        )
        
        # Generate response
        response_data = generate_pdf_response(buffer, f"Risk_Register_{tahun}")
        
        return Response(
            content=response_data["content"],
            media_type=response_data["media_type"],
            headers=response_data["headers"]
        ) 