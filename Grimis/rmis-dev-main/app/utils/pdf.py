import os
import sys
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import io

# macOS Homebrew fallback for ctypes/weasyprint dependencies
if sys.platform == "darwin":
    brew_lib_path = "/opt/homebrew/lib"
    current_fallback = os.environ.get("DYLD_FALLBACK_LIBRARY_PATH", "")
    if brew_lib_path not in current_fallback:
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = f"{brew_lib_path}:{current_fallback}" if current_fallback else brew_lib_path

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')

def generate_pdf_from_template(template_name: str, context: dict) -> bytes:
    """
    Render Jinja2 template ke HTML dan convert ke PDF menggunakan WeasyPrint.
    Return berupa bytes dari PDF.
    """
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template(f"pdf/{template_name}")
    
    # Tambahkan global helpers
    context['print_date'] = datetime.now().strftime("%d %B %Y %H:%M:%S")
    
    html_out = template.render(context)
    
    # Generate PDF Object
    pdf_bytes = io.BytesIO()
    
    try:
        from weasyprint import HTML
        HTML(string=html_out, base_url=TEMPLATE_DIR).write_pdf(pdf_bytes)
    except Exception as e:
        print(f"Failed to load WeasyPrint or generate PDF: {e}")
        # Insert raw HTML output as a fallback or return an empty PDF structure
        # A simple valid PDF fallback (blank page with error text)
        error_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/MediaBox [0 0 595 842]\n/Count 1\n/Kids [ 3 0 R ]\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(WeasyPrint Error) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000147 00000 n\n0000000251 00000 n\n0000000339 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n434\n%%EOF"
        return error_pdf
    
    pdf_bytes.seek(0)
    return pdf_bytes.read()
