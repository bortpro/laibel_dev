
# LAIbel

A lightweight image annotation tool designed for efficient labeling of images to create downstream AI models.

LAIbel provides a clean, browser-based interface for drawing and managing bounding box annotations across multiple images, streamlining the data preparation phase for computer vision tasks.

**Core Features:**

*   **Multiple Image Handling:** Upload and navigate between multiple images.
*   **Bounding Box Annotation:** Draw and resize bounding boxes directly on the canvas.
*   **Label Management:** Create, assign colors to, and delete custom labels.
*   **Annotation Export:**
    *   Export annotations for all images in a structured **JSON** format.
    *   Export annotations in the standard **YOLO** `.txt` format, compatible with YOLO & Ultralytics.
*   **Keyboard Shortcuts:** Quick navigation developed thoughtfully for the user to greatly increase labeling speed.
*   **Tech Stack:** Simple Flask backend with core logic implemented in vanilla JavaScript on the client-side.


### Tech Stack

LAIbel is built with a focus on simplicity and client-side performance.
*   **Backend:** A minimal **Flask** (Python) web server is used primarily to serve the HTML, CSS, and JavaScript files. It's designed to be lightweight and easy to deploy. 
*   **Frontend:** The core annotation logic, UI interactions, state management, and rendering are handled entirely using **vanilla JavaScript**, HTML5 Canvas, and CSS. This choice avoids heavy framework dependencies, aiming for fast loading times and a responsive user experience directly in the browser.

### Project Goal

The primary goal of LAIbel is to accelerate the often tedious process of image annotation. We aim to develop a tool that is not only functional but also exceptionally fast and intuitive to use, reducing the time and effort required to prepare high-quality datasets for machine learning. By focusing on a streamlined user experience, efficient browser-based processing, and compatibility with standard formats like YOLO, LAIbel strives to be a valuable asset in any computer vision practitioner's toolkit. The long-term vision is to make LAIbel one of the fastest and most user-friendly open-source labeling tools available.

**Upcoming Features:**

*   **AI-Assisted Labeling** Lightweight background AI model aids in automatic labeling.
*   **Active Learning Labeling** Support active learning labeling.
*   **Batch Annotation:** Automate annotation tasks for large datasets.
*   **Performance Optimization:** Improve performance for large datasets and complex annotations.
*   **Advanced Annotation Tools:** Support for other segmentation tasks and integration of custom models, such as versions ofSegment Anything Model (SAM)
*   **Integration with AI Models:** Train and evaluate AI models directly within the tool.
