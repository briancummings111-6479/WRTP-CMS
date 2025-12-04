
import sys
import os

file_path = r"src/pages/ClientDashboardPage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
found_cert = False

cert_title_action = """                    !isEditingTraining ? (
                        <button
                          onClick={() => setIsEditingTraining(true)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4 mr-2 text-gray-500" />
                          Edit
                        </button>
                    ) : (
                        <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={handleTrainingCancel}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleTrainingSave}
                              disabled={isTrainingSaving}
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89] disabled:cursor-not-allowed"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {isTrainingSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )
"""

while i < len(lines):
    line = lines[i]
    
    if "activeTab === 'Certificates and CTE'" in line:
        new_lines.append(line)
        i += 1
        # Expect outer div
        if i < len(lines) and "<div>" in lines[i]:
            # Replace with Card start
            new_lines.append(lines[i].replace("<div>", '<Card title="Training Status" titleAction={'))
            new_lines.append(cert_title_action)
            new_lines.append("                  }>\n")
            i += 1
            
            # Now process the content
            while i < len(lines):
                curr_line = lines[i]
                stripped = curr_line.strip()
                
                # Check for outer div closing
                if stripped == "</div>" and curr_line.startswith("                  </div>"):
                    new_lines.append(curr_line.replace("</div>", "</Card>"))
                    i += 1
                    found_cert = True
                    break
                
                # Remove Display Mode Header
                if 'className="flex justify-between items-center mb-4"' in curr_line:
                    # Skip this div and its content (h3 and button)
                    # We need to skip until the closing div of this header
                    # The header contains h3 and button.
                    # It ends when we find a closing div with same indentation?
                    # Or just skip specific lines we know are there.
                    
                    # Skip the opening div
                    i += 1
                    # Skip h3
                    if i < len(lines) and "Training Status</h3>" in lines[i]:
                        i += 1
                    # Skip button block
                    while i < len(lines) and "</div>" not in lines[i]:
                        i += 1
                    # Skip closing div
                    if i < len(lines) and "</div>" in lines[i]:
                        i += 1
                    continue
                
                # Remove Edit Mode Header
                if '<h3 className="text-lg font-medium text-gray-900 mb-4">Edit Training Status</h3>' in stripped:
                    i += 1
                    continue
                
                # Remove Edit Mode Buttons at bottom
                if 'className="flex justify-end space-x-3"' in curr_line:
                    # Skip this div and its content
                    i += 1
                    while i < len(lines) and "</div>" not in lines[i]: # This is risky if nested
                        # Actually the buttons are inside.
                        # We just skip until we see the closing div of this flex container.
                        # The closing div should be indented.
                        i += 1
                    # Skip closing div
                    if i < len(lines) and "</div>" in lines[i]:
                        i += 1
                    continue
                
                new_lines.append(curr_line)
                i += 1
            continue

    new_lines.append(line)
    i += 1

if found_cert:
    print("Updated Certificates")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
else:
    print("Failed to update Certificates - Pattern not found")
