from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape, portrait
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from datetime import datetime
import io

def create_pdf_buffer(landscape_mode=True):
    """
    Create and return a BytesIO buffer for PDF generation
    """
    return io.BytesIO()

def create_document(buffer, landscape_mode=True, top_margin=50, bottom_margin=50):
    """
    Create a PDF document with specified settings
    
    Args:
        buffer: BytesIO buffer to write the PDF to
        landscape_mode: Whether to use landscape orientation
        top_margin: Top margin in points
        bottom_margin: Bottom margin in points
    
    Returns:
        ReportLab Document object
    """
    page_size = landscape(A4) if landscape_mode else A4
    
    return SimpleDocTemplate(
        buffer, 
        pagesize=page_size,
        rightMargin=30,
        leftMargin=30,
        topMargin=top_margin,
        bottomMargin=bottom_margin
    )

def get_styles():
    """
    Get and return common styles for PDF documents
    
    Returns:
        dict: Dictionary containing various styles
    """
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = styles["Heading1"]
    title_style.alignment = 1  # Center alignment
    title_style.fontSize = 14
    title_style.leading = 16
    
    # Subtitle style
    subtitle_style = styles["Heading2"]
    subtitle_style.alignment = 1
    subtitle_style.fontSize = 12
    subtitle_style.leading = 14
    
    # Normal text style
    normal_style = styles["Normal"]
    normal_style.fontSize = 8
    normal_style.leading = 10  # Line spacing
    
    # Left align style for tables
    left_style = ParagraphStyle(
        'LeftStyle', 
        parent=normal_style,
        alignment=0  # 0 = left
    )
    
    # Center align style for tables
    center_style = ParagraphStyle(
        'CenterStyle', 
        parent=normal_style,
        alignment=1  # 1 = center
    )
    
    # Justify style for tables
    justify_style = ParagraphStyle(
        'JustifyStyle', 
        parent=normal_style,
        alignment=4  # 4 = justify
    )
    
    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'normal': normal_style,
        'left': left_style,
        'center': center_style,
        'justify': justify_style
    }

def create_paragraph(text, style=None):
    """
    Create a paragraph with specified text and style
    
    Args:
        text: Text content
        style: Style to apply to paragraph
    
    Returns:
        Paragraph object
    """
    if style is None:
        styles = get_styles()
        style = styles['left']
        
    if not text:
        return Paragraph("", style)
    
    return Paragraph(text, style)

def add_page_number(canvas, doc, print_date=True, extra_text=None):
    """
    Add page number and date to each page
    
    Args:
        canvas: ReportLab canvas
        doc: ReportLab document
        print_date: Whether to print the current date/time
        extra_text: Optional extra text to display (e.g., year, institution)
    """
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    
    # Add page number at bottom right
    canvas.drawString(doc.width + doc.leftMargin - 100, 0.5 * cm, f"Halaman {canvas.getPageNumber()}")
    
    # Add date at bottom left
    if print_date:
        canvas.drawString(doc.leftMargin, 0.5 * cm, f"Dicetak pada: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
    
    # Add extra text at bottom center if provided
    if extra_text:
        canvas.drawString((doc.width + doc.leftMargin) / 2 - 50, 0.5 * cm, extra_text)
    
    canvas.restoreState()

def create_table(data, col_widths, page_width, table_style=None, repeat_rows=1):
    """
    Create a table with specified data and styling
    
    Args:
        data: 2D array of table data
        col_widths: List of column widths (as percentages or absolute values)
        page_width: Width of the page
        table_style: Optional custom TableStyle commands to use instead of default
        repeat_rows: Number of header rows to repeat on each page
    
    Returns:
        Styled Table object
    """
    # Calculate column widths if percentages are provided
    calculated_widths = []
    for width in col_widths:
        if isinstance(width, float) and width <= 1.0:
            calculated_widths.append(width * page_width)
        else:
            calculated_widths.append(width)
    
    # Create table with defined column widths
    table = Table(data, repeatRows=repeat_rows, colWidths=calculated_widths)
    
    # Apply custom style if provided, otherwise use default
    if table_style:
        table.setStyle(TableStyle(table_style))
    else:
        # Apply default table style
        table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            
            # Content styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            
            # Grid styling
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            
            # Word wrapping
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
    
    return table

def apply_custom_table_style(table, style_list):
    """
    Apply additional custom styling to a table
    
    Args:
        table: Table object
        style_list: List of style commands to apply
    
    Returns:
        Table with updated style
    """
    table.setStyle(TableStyle(style_list))
    return table

def generate_pdf_response(buffer, filename_prefix):
    """
    Prepare a FastAPI Response with PDF content
    
    Args:
        buffer: BytesIO buffer containing PDF content
        filename_prefix: Prefix for the generated filename
    
    Returns:
        dict with content, media_type and headers for FastAPI Response
    """
    # Get PDF content
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Generate filename with timestamp
    filename = f"{filename_prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    
    # Prepare response
    return {
        "content": pdf_content,
        "media_type": "application/pdf",
        "headers": {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'application/pdf',
        }
    } 