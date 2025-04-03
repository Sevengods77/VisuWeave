import psycopg2
import os

# Database connection parameters
DB_HOST = "127.0.0.1"
DB_PORT = "5434"
DB_NAME = "image_db"
DB_USER = "image_user"
DB_PASSWORD = "visuweave"

# Path to the folder containing images
image_folder = "/home/geek/Downloads/Unisys 2025/Dataset"

# Connect to the database
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cursor = conn.cursor()

# Loop through all files in the image folder
for filename in os.listdir(image_folder):
    image_path = os.path.join(image_folder, filename)

    # Check if it's a file and read as binary
    if os.path.isfile(image_path):
        with open(image_path, 'rb') as file:
            binary_data = file.read()

        # Insert image into the table
        cursor.execute(
            "INSERT INTO images (filename, img) VALUES (%s, %s)",
            (filename, binary_data)
        )

# Commit the changes
conn.commit()
print("✅ Images inserted successfully!")

# Close connection
cursor.close()
conn.close()
