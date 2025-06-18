# Timesheet Application

This is a simple static web application. To run it locally, you can use Python's built-in HTTP server.

## How to Run

1.  **Ensure Python is installed:**
    If you don't have Python installed, you can download it from the official Python website: <mcurl name="https://www.python.org/downloads/" url="https://www.python.org/downloads/"></mcurl>

2.  **Navigate to the application directory:**
    Open your terminal or command prompt and navigate to the root directory of this project (where `index.html` is located).

    ```bash
    cd path/to/your/timesheet-main
    ```

3.  **Start the HTTP server:**
    Run the following command to start a simple HTTP server on port 8000:

    ```bash
    python -m http.server 8000
    ```

4.  **Access the application:**
    Open your web browser and go to: <mcurl name="http://localhost:8000/" url="http://localhost:8000/"></mcurl>

    If you encounter issues with a different application loading, please clear your browser's cache and site data for `localhost:8000`.

    *   **For Chrome:** Open Developer Tools (F12), go to the "Application" tab, then "Storage", and click "Clear site data".
    *   **For Firefox:** Open Developer Tools (F12), go to the "Storage" tab, right-click on "Local Storage" or "IndexedDB" for `http://localhost:8000`, and choose "Delete All".

Enjoy!
