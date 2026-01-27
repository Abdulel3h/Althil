# Report Service - PDF generation
from fpdf import FPDF
import datetime
import io
import os


class AlthilReport(FPDF):
    """Custom PDF class for al'thil reports."""
    
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, "al'thil - Urban Shade Analysis Report", 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 5, 'Estimated Values - Prototype Analysis', 0, 1, 'C')
        self.ln(5)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()} | Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 0, 'C')


def generate_analysis_pdf(analysis_data: dict) -> bytes:
    """
    Generate a PDF report from analysis data.
    Returns PDF as bytes.
    """
    pdf = AlthilReport()
    pdf.add_page()
    
    # Location Summary
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Location Summary', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    location = analysis_data.get('location', {})
    pdf.cell(0, 7, f"Latitude: {location.get('lat', 'N/A')}", 0, 1)
    pdf.cell(0, 7, f"Longitude: {location.get('lng', 'N/A')}", 0, 1)
    pdf.ln(5)
    
    # Sun Data
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Solar Analysis', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    sun_data = analysis_data.get('sun_data', {})
    pdf.cell(0, 7, f"Sun Altitude: {sun_data.get('altitude', 'N/A')} degrees", 0, 1)
    pdf.cell(0, 7, f"Sun Azimuth: {sun_data.get('azimuth', 'N/A')} degrees", 0, 1)
    pdf.ln(5)
    
    # Heat Analysis
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Heat Risk Assessment (Estimated)', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    heat_data = analysis_data.get('heat_analysis', {})
    pdf.cell(0, 7, f"Heat Score: {heat_data.get('heat_score', 'N/A')} / 100", 0, 1)
    pdf.cell(0, 7, f"Risk Level: {heat_data.get('risk_level', 'N/A')}", 0, 1)
    pdf.ln(5)
    
    # Recommendations
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Shade Recommendations', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    recommendations = analysis_data.get('recommendations', {})
    summary = recommendations.get('summary', {})
    
    pdf.cell(0, 7, f"Primary Solution: {summary.get('primary_solution', 'N/A')}", 0, 1)
    pdf.cell(0, 7, f"Secondary Solution: {summary.get('secondary_solution', 'N/A')}", 0, 1)
    pdf.cell(0, 7, f"Estimated Tree Count: {summary.get('estimated_tree_count', 'N/A')}", 0, 1)
    pdf.cell(0, 7, f"Cooling Potential: {summary.get('cooling_potential', 'N/A')}", 0, 1)
    pdf.ln(5)
    
    # Image Analysis (if available)
    image_analysis = analysis_data.get('image_analysis')
    if image_analysis and not image_analysis.get('error'):
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Site Image Analysis', 0, 1)
        pdf.set_font('Arial', '', 11)
        
        pdf.cell(0, 7, f"Green Coverage: {image_analysis.get('green_coverage', 'N/A')}%", 0, 1)
        pdf.cell(0, 7, f"Urban Density: {image_analysis.get('urban_density', 'N/A')}%", 0, 1)
        pdf.cell(0, 7, f"Shade Need: {image_analysis.get('shade_need', 'N/A')}", 0, 1)
    
    # Disclaimer
    pdf.ln(10)
    pdf.set_font('Arial', 'I', 9)
    pdf.multi_cell(0, 5, 
        "DISCLAIMER: All values in this report are estimated based on simulated data and rule-based analysis. "
        "This is a prototype system and should not be used for actual urban planning decisions without professional verification."
    )
    
    # Add Logo at the bottom
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logo_path = os.path.join(base_dir, "static", "logo.png")
        if os.path.exists(logo_path):
            # Place at bottom center
            pdf.ln(10)
            # Center the image: (page_width - img_width) / 2
            img_width = 20
            x_pos = (pdf.w - img_width) / 2
            pdf.image(logo_path, x=x_pos, w=img_width)
    except Exception as e:
        print(f"Error adding logo to PDF: {e}")
    
    # Return as bytes
    return pdf.output(dest='S').encode('latin-1')
