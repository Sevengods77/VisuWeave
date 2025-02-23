import google.generativeai as genai
import os
import subprocess
import re

# Set up Gemini API
GEMINI_API_KEY = "*************"  # Replace with your  API key
genai.configure(api_key=GEMINI_API_KEY)

def optimize_prompt(user_input):
    """
    Converts user input into a structured prompt to ensure Gemini generates correct Manim code.
    """
    return (
        "You are an expert in Manim animations. Generate only valid Python code using Manim. "
        "Use `Scene` for 2D animations. "
        "Include `from manim import *` at the beginning. "
        "Ensure the script includes `if __name__ == '__main__'` to be executable. "
        "All animations should have `run_time=5`. "
        "Return the full script inside a Python code block without explanations.\n\n"
        f"User Request: {user_input}\n\n"
        "Now generate a complete, error-free Manim Scene class."
    )

def extract_code(response_text):
    """
    Extracts the Python code from Gemini's response.
    """
    match = re.search(r"```python(.*?)```", response_text, re.DOTALL)
    return match.group(1).strip() if match else response_text.strip()

def validate_generated_code(generated_code):
    """
    Ensures the generated code includes a valid Scene class and `construct()` method.
    """
    if not re.search(r"class \w+\(Scene\):", generated_code):
        print("❌ Error: No valid Manim scene class found.")
        return False
    if "def construct(" not in generated_code:
        print("❌ Error: Missing `construct()` method in the script.")
        return False
    return True

def generate_manim_code(user_prompt):
    """
    Requests Manim code from Gemini, validates, and saves it.
    """
    structured_prompt = optimize_prompt(user_prompt)
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content([structured_prompt])
    
    raw_text = response.text
    extracted_code = extract_code(raw_text)
    
    # Print generated code for debugging
    print("\n--- Generated Code ---\n")
    print(extracted_code)
    print("\n----------------------\n")
    
    if not validate_generated_code(extracted_code):
        return None
    
    # Save the valid code
    file_path = "generated_animation.py"
    with open(file_path, "w") as file:
        file.write(extracted_code)
    
    print(f"✅ Code saved in {file_path}")
    return file_path

def get_scene_name(script_name):
    """
    Extracts the scene class name from the script.
    """
    with open(script_name, "r") as file:
        for line in file:
            match = re.match(r"class (\w+)\(Scene\):", line)
            if match:
                return match.group(1)
    return None

def run_manim_script(script_name):
    """
    Runs the generated Manim script.
    """
    scene_name = get_scene_name(script_name)
    if not scene_name:
        print("❌ Error: No valid Scene class found in the script.")
        return
    
    try:
        subprocess.run(["python", "-m", "manim", "-pql", script_name, scene_name], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running Manim script: {e}")

if __name__ == "__main__":
    user_prompt = input("Enter animation request : ")
    script_name = generate_manim_code(user_prompt)

    if script_name:
        run_manim_script(script_name)
