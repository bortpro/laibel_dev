```md
# LAIbel

A lightweight image annotation tool designed for efficient labeling of images to create downstream AI models.

**Core Features:**

*   **Multiple Image Handling:** Upload and navigate between multiple images.
*   **Bounding Box Annotation:** Draw and resize bounding boxes directly on the canvas.
*   **Label Management:** Create, assign colors to, and delete custom labels.
*   **Annotation Export:**
    *   Export annotations for all images in a structured **JSON** format.
    *   Export annotations in the standard **YOLO** `.txt` format, compatible with YOLO & Ultralytics.
*   **Keyboard Shortcuts:** Quick navigation developed thoughtfully for the user to greatly increase labeling speed.
*   **Tech Stack:** Simple Flask backend with core logic implemented in vanilla JavaScript on the client-side.

**Upcoming Features:**

*   **AI-Assisted Labeling** Lightweight background AI model aids in automatic labeling.
*   **Active Learning Labeling** Support active learning labeling.
*   **Batch Annotation:** Automate annotation tasks for large datasets.
*   **Performance Optimization:** Improve performance for large datasets and complex annotations.
*   **Advanced Annotation Tools:** Support for other segmentation tasks and integration of custom models, such as versions ofSegment Anything Model (SAM)
*   **Integration with AI Models:** Train and evaluate AI models directly within the tool.
