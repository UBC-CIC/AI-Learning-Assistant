import os
import subprocess
import zipfile

# This script downloads the dependencies for text generation as ZIP files. Other unnecessary files that are also added need to be manually removed.

script_directory = os.path.dirname(os.path.abspath(__file__))

target_directory = script_directory

os.chdir(target_directory)

packages = [
    'torch',
    'langchain',
    # 'langchain-aws',
    # 'langchain-core',
    # 'langchain-community',
    # 'langchain-experimental',
    # 'langchain-postgres',
    # 'psycopg[binary,pool]',
    'open_clip_torch',
    # 'psycopg2-binary',
    # 'python-dotenv'
]

for package in packages:
    subprocess.run(['pip', 'download', package])

for package in packages:
    package_wheel_file = None
    for file_name in os.listdir(target_directory):
        if file_name.startswith(package) and file_name.endswith('.whl'):
            package_wheel_file = file_name
            break

    if package_wheel_file:
        zip_file_name = f"{package}.zip"
        with zipfile.ZipFile(zip_file_name, 'w') as zipf:
            zipf.write(package_wheel_file)
        
        os.remove(package_wheel_file)

        print(f"Downloaded and zipped {package} as {zip_file_name} in {target_directory}")
    else:
        print(f"Wheel file for {package} not found.")

print("All specified packages have been processed.")