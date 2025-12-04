
import sys
import os

file_path = r"src/pages/ClientDashboardPage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
found_audit = False

while i < len(lines):
    line = lines[i]
    
    # Audit Checklist Logic
    if "activeTab === 'Audit Checklist'" in line:
        new_lines.append(line)
        i += 1
        # Expect outer div
        if i < len(lines) and "<div>" in lines[i]:
            # Replace with Card start
            new_lines.append(lines[i].replace("<div>", '<Card title="Audit Checklist" titleAction={'))
            i += 1
            # Expect header div
            if i < len(lines) and 'className="flex justify-between items-center mb-4"' in lines[i]:
                # Skip header div line
                i += 1
                # Expect h3
                if i < len(lines) and '<h3 className="text-lg font-medium text-gray-900">Audit Checklist</h3>' in lines[i].strip():
                    # Skip h3 line
                    i += 1
                    
                    # Copy content until header div closes
                    while i < len(lines):
                        if lines[i].strip() == "</div>":
                            # This is the header div closing.
                            # Replace with }>
                            new_lines.append(lines[i].replace("</div>", "}>"))
                            i += 1
                            break
                        new_lines.append(lines[i])
                        i += 1
                    
                    # Now we are in the body.
                    # Find the outer div closing.
                    while i < len(lines):
                        if lines[i].strip() == "</div>" and lines[i].startswith("                  </div>"):
                            # This is the outer div closing.
                            # Replace with </Card>
                            new_lines.append(lines[i].replace("</div>", "</Card>"))
                            i += 1
                            found_audit = True
                            break
                        new_lines.append(lines[i])
                        i += 1
                    
                    continue
    
    new_lines.append(line)
    i += 1

if found_audit:
    print("Updated Audit Checklist")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
else:
    print("Failed to update Audit Checklist - Pattern not found")
