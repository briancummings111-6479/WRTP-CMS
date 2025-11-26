import xml.etree.ElementTree as ET

def extract_text(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    # Namespaces
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    text_content = []
    for p in root.findall('.//w:p', ns):
        para_text = ""
        for r in p.findall('.//w:r', ns):
            for t in r.findall('.//w:t', ns):
                if t.text:
                    para_text += t.text
        if para_text:
            text_content.append(para_text)
            
    return "\n".join(text_content)

if __name__ == "__main__":
    xml_file = r"c:\Users\brian\WRTP-CMS\temp_docx\word\document.xml"
    print(extract_text(xml_file))
