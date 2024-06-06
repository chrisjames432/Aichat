import os

def scan_directory(directory, indent=0, ignore=[]):
    result = []
    files_list = []
    for item in sorted(os.listdir(directory)):
        if any(item == ignore_item or item.startswith(ignore_item + '/') for ignore_item in ignore):
            continue
        path = os.path.join(directory, item)
        if os.path.isdir(path):
            result.append('    ' * indent + '├── ' + item)
            sub_result, sub_files_list = scan_directory(path, indent + 1, ignore)
            result.extend(sub_result)
            files_list.extend(sub_files_list)
        else:
            result.append('    ' * indent + '├── ' + item)
            files_list.append(path)
    return result, files_list

def create_directory_structure(filename, ignore=[]):
    directory = os.path.dirname(os.path.abspath(__file__))
    script_name = os.path.basename(__file__)
    
    if script_name not in ignore:
        ignore.append(script_name)
    
    directory_structure, files_list = scan_directory(directory, ignore=ignore)
    
    with open(filename, 'w', encoding='utf-8') as file:
        instructions = (
            "Only show files you edit.\n"
            "This is the current version of the project directory and its file contents.\n\n"
        )
        heading = "Directory Structure of the Project\n"
        heading += "This file contains a structured listing of all directories and files within the project. Contents are included for specified files.\n\n"
        file.write(instructions)
        file.write(heading)
        file.write('\n'.join(directory_structure) + "\n\n")
    
    return files_list

def append_file_contents(filename, files_list):
    with open(filename, 'a', encoding='utf-8') as file:
        for file_path in files_list:
            relative_path = os.path.relpath(file_path, os.path.dirname(os.path.abspath(__file__)))
            file.write(f"Contents of {relative_path}:\n")
            file.write("--- start -----------------------\n\n")
            try:
                with open(file_path, 'r', encoding='utf-8') as content_file:
                    file.write(content_file.read())
            except Exception as e:
                file.write(f"Error reading file: {str(e)}")
            file.write("\n\n--- end -----------------------\n\n\n")

def main():
    ignore_list = [
        'node_modules', 
        '.git', 
        '.env',
        'conversations',
        'program_structure.txt',
        'package-lock.json', 
        'package.json'
    ]
    filename = 'program_structure.txt'
    files_left = create_directory_structure(filename, ignore_list)
    append_file_contents(filename, files_left)



if __name__ == "__main__":
    main()

