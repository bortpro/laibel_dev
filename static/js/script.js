document.addEventListener("DOMContentLoaded", function () {
  // --- NEW: Configuration for resizing ---
  const MAX_WIDTH = 640; // Max width for display
  const MAX_HEIGHT = 480; // Max height for display
  let scaleRatio = 1; // To store the ratio between original and displayed size
  let originalWidth = 0; // To store original image width
  let originalHeight = 0; // To store original image height
  let currentFilename = "annotated_image"; // Default filename base

  // Canvas setup
  const canvas = document.getElementById("image-canvas");
  const ctx = canvas.getContext("2d");
  let image = null; // This will hold the Image object

  // Drawing state
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let boxes = [];
  let activeBoxIndex = -1;
  let labels = [];
  let currentTool = "draw"; // 'draw' or 'move'

  // DOM elements
  const uploadBtn = document.getElementById("upload-btn");
  const imageUpload = document.getElementById("image-upload");
  const saveBtn = document.getElementById("save-btn");
  const drawBoxBtn = document.getElementById("draw-box-btn");
  const moveBoxBtn = document.getElementById("move-box-btn");
  const addLabelBtn = document.getElementById("add-label-btn");
  const newLabelInput = document.getElementById("new-label");
  const labelsList = document.getElementById("labels-list");
  const annotationsList = document.getElementById("annotations-list");

  // Tool selection
  drawBoxBtn.addEventListener("click", () => {
    currentTool = "draw";
    drawBoxBtn.classList.add("active");
    moveBoxBtn.classList.remove("active");
    canvas.style.cursor = "crosshair"; // Set cursor for drawing
  });

  moveBoxBtn.addEventListener("click", () => {
    currentTool = "move";
    moveBoxBtn.classList.add("active");
    drawBoxBtn.classList.remove("active");
    canvas.style.cursor = "move"; // Set cursor for moving
  });

  // Set initial cursor
  canvas.style.cursor = "crosshair";

  // Image upload handling
  uploadBtn.addEventListener("click", () => {
    imageUpload.click();
  });

  imageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // --- NEW: Store filename ---
      currentFilename = file.name.split(".")[0]; // Use filename without extension

      const reader = new FileReader();
      reader.onload = function (event) {
        image = new Image(); // Create a new Image object
        image.onload = function () {
          // --- MODIFIED: Image Resizing Logic ---
          originalWidth = image.width;
          originalHeight = image.height;
          scaleRatio = 1; // Reset scale ratio

          // Calculate the scaling factor to fit within MAX_WIDTH and MAX_HEIGHT
          if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
            const widthRatio = MAX_WIDTH / originalWidth;
            const heightRatio = MAX_HEIGHT / originalHeight;
            scaleRatio = Math.min(widthRatio, heightRatio); // Use the smaller ratio to fit entirely
          }

          // Calculate the new dimensions for the canvas
          const displayWidth = Math.round(originalWidth * scaleRatio);
          const displayHeight = Math.round(originalHeight * scaleRatio);

          // Resize canvas to the calculated display dimensions
          canvas.width = displayWidth;
          canvas.height = displayHeight;

          // Draw the image scaled onto the canvas
          ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
          // --- End of Modification ---

          // Clear existing boxes
          boxes = [];
          redrawCanvas(); // Use redrawCanvas to handle image drawing now
          updateAnnotationsList(); // Clear annotations list as well
        };
        image.src = event.target.result; // Set the source *after* defining onload
      };
      reader.readAsDataURL(file);
    }
  });

  // Canvas event listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  // --- NEW: Add mouseleave to cancel drawing if mouse leaves canvas ---
  canvas.addEventListener("mouseleave", handleMouseLeave);

  function handleMouseDown(e) {
    if (!image) return; // Don't do anything if no image is loaded

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (currentTool === "draw") {
      isDrawing = true;
    } else if (currentTool === "move") {
      // Logic for selecting a box to move (implement later if needed)
      console.log("Move tool selected - mousedown (selection logic TBD)");
    }
  }

  function handleMouseMove(e) {
    if (!isDrawing || currentTool !== "draw") return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    redrawCanvas(); // Redraw the image and existing boxes

    // Draw the new box being drawn
    ctx.strokeStyle = "#4a6cf7"; // Use a distinct color for the drawing box
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
  }

  function handleMouseUp(e) {
    if (!isDrawing || currentTool !== "draw") return;
    isDrawing = false; // Stop drawing

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const width = endX - startX;
    const height = endY - startY;

    // Only add box if it has a minimum size (e.g., > 5 pixels)
    if (Math.abs(width) > 5 && Math.abs(height) > 5) {
      const newBox = {
        x: Math.min(startX, endX), // Handle drawing in any direction
        y: Math.min(startY, endY),
        width: Math.abs(width),
        height: Math.abs(height),
        label: labels.length > 0 ? labels[0].name : "unlabeled", // Default to first label or 'unlabeled'
      };
      boxes.push(newBox);
      updateAnnotationsList(); // Update the list display
    }

    redrawCanvas(); // Redraw canvas to show the final box
  }

  // --- NEW: Handle mouse leaving the canvas during drawing ---
  function handleMouseLeave(e) {
    if (isDrawing) {
      console.log("Mouse left canvas during draw, cancelling.");
      isDrawing = false;
      redrawCanvas(); // Remove the temporary drawing rectangle
    }
  }

  function redrawCanvas() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image if it exists, scaled to canvas dimensions
    if (image) {
      // Ensure canvas dimensions match the expected display size
      if (
        canvas.width !== Math.round(originalWidth * scaleRatio) ||
        canvas.height !== Math.round(originalHeight * scaleRatio)
      ) {
        canvas.width = Math.round(originalWidth * scaleRatio);
        canvas.height = Math.round(originalHeight * scaleRatio);
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    // Draw all stored boxes
    boxes.forEach((box, index) => {
      // Find label color
      const labelObj = labels.find((l) => l.name === box.label);
      const color = labelObj ? labelObj.color : "#CCCCCC"; // Default to gray if label not found

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label text above the box
      if (box.label) {
        ctx.fillStyle = color;
        // Simple text background
        const text = box.label;
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(box.x, box.y - 16, textWidth + 10, 16); // Background rectangle

        ctx.fillStyle = "white"; // Text color
        ctx.font = "12px Arial";
        ctx.fillText(text, box.x + 5, box.y - 4); // Text position
      }
    });
  }

  // Label management
  addLabelBtn.addEventListener("click", addNewLabel);
  newLabelInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewLabel();
    }
  });

  function addNewLabel() {
    const labelName = newLabelInput.value.trim();
    if (labelName && !labels.some((l) => l.name === labelName)) {
      const color = getRandomColor();
      labels.push({ name: labelName, color: color });
      updateLabelsList();
      // --- NEW: Refresh annotations list if a new label is added (to update selects) ---
      updateAnnotationsList();
      // --- NEW: Assign the new label to unlabeled boxes if it's the first label ---
      if (labels.length === 1) {
        boxes.forEach((box) => {
          if (box.label === "unlabeled") {
            box.label = labelName;
          }
        });
        redrawCanvas();
        updateAnnotationsList(); // Refresh again to show assigned label
      }
      newLabelInput.value = "";
    } else if (!labelName) {
      alert("Please enter a label name.");
    } else {
      alert(`Label "${labelName}" already exists.`);
    }
  }

  function updateLabelsList() {
    labelsList.innerHTML = ""; // Clear current list
    labels.forEach((label, index) => {
      const labelItem = document.createElement("div");
      labelItem.className = "label-item";
      labelItem.style.cursor = "pointer"; // Indicate it's clickable

      const labelDisplay = document.createElement("div");
      labelDisplay.innerHTML = `<span class="label-color" style="background-color: ${label.color}"></span>${label.name}`;

      // --- NEW: Allow clicking label to set it for the next drawn box ---
      // Note: This feature is less direct. A better approach might be a "current label" selector.
      // For now, let's just update the default for new boxes if clicked.
      labelItem.onclick = () => {
        console.log(
          `Selected ${label.name} as default for next box (if unlabeled).`,
        );
        // We could store a 'currentLabel' variable here if desired.
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn delete-label-btn";
      deleteBtn.textContent = "X"; // Smaller delete button
      deleteBtn.title = `Delete label "${label.name}"`; // Tooltip
      deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent label selection click
        const labelNameToDelete = label.name;
        labels.splice(index, 1); // Remove from array by index
        // --- NEW: Update boxes that used this label ---
        boxes.forEach((box) => {
          if (box.label === labelNameToDelete) {
            box.label = labels.length > 0 ? labels[0].name : "unlabeled"; // Assign first available or 'unlabeled'
          }
        });
        updateLabelsList(); // Refresh label list UI
        updateAnnotationsList(); // Refresh annotations list UI (selects change)
        redrawCanvas(); // Redraw boxes with potentially new labels/colors
      };

      labelItem.appendChild(labelDisplay);
      labelItem.appendChild(deleteBtn);
      labelsList.appendChild(labelItem);
    });
  }

  function updateAnnotationsList() {
    annotationsList.innerHTML = ""; // Clear current list
    boxes.forEach((box, index) => {
      const annotationItem = document.createElement("div");
      annotationItem.className = "annotation-item";
      // Highlight box on hover (optional enhancement)
      annotationItem.onmouseenter = () => {
        /* highlight box on canvas */
      };
      annotationItem.onmouseleave = () => {
        /* remove highlight */
      };

      // Label Selector Dropdown
      const labelSelect = document.createElement("select");
      labelSelect.className = "annotation-label-select";

      // Add 'unlabeled' option if no labels exist or box is unlabeled
      if (
        labels.length === 0 ||
        box.label === "unlabeled" ||
        !labels.some((l) => l.name === box.label)
      ) {
        const option = document.createElement("option");
        option.value = "unlabeled";
        option.textContent = "unlabeled";
        option.selected =
          box.label === "unlabeled" ||
          !labels.some((l) => l.name === box.label);
        labelSelect.appendChild(option);
      }

      // Add existing labels
      labels.forEach((label) => {
        const option = document.createElement("option");
        option.value = label.name;
        option.textContent = label.name;
        if (box.label === label.name) {
          option.selected = true;
        }
        labelSelect.appendChild(option);
      });

      // Update box label on change
      labelSelect.onchange = (e) => {
        boxes[index].label = e.target.value; // Update the specific box in the array
        redrawCanvas(); // Redraw canvas with new label color/text
      };

      // Delete Button for this annotation
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn delete-annotation-btn";
      deleteBtn.textContent = "X"; // Smaller delete button
      deleteBtn.title = "Delete this annotation"; // Tooltip
      deleteBtn.onclick = () => {
        boxes.splice(index, 1); // Remove the box from the array by index
        updateAnnotationsList(); // Refresh the list UI (re-indexes remaining items)
        redrawCanvas(); // Redraw canvas without the deleted box
      };

      // --- REMOVED COORDINATE DISPLAY CREATION ---
      // const coordsSpan = document.createElement("span");
      // coordsSpan.className = "annotation-coords";
      // coordsSpan.textContent = ` (${Math.round(box.x)}, ${Math.round(box.y)}, ${Math.round(box.width)}, ${Math.round(box.height)})`;
      // coordsSpan.title = "Coordinates on displayed image";
      // --- END REMOVAL ---

      annotationItem.appendChild(labelSelect);
      // --- REMOVED COORDINATE DISPLAY APPENDING ---
      // annotationItem.appendChild(coordsSpan); // Add coordinates display
      // --- END REMOVAL ---
      annotationItem.appendChild(deleteBtn);
      annotationsList.appendChild(annotationItem);
    });
  }

  // Save annotations
  saveBtn.addEventListener("click", () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }
    if (boxes.length === 0) {
      alert("No annotations to save!");
      return;
    }

    // --- MODIFIED: Scale coordinates back to original image size ---
    const annotationsToSave = {
      image_filename: currentFilename + ".jpg", // Or original extension
      image_width: originalWidth,
      image_height: originalHeight,
      boxes: boxes.map((box) => ({
        x_min: Math.round(box.x / scaleRatio),
        y_min: Math.round(box.y / scaleRatio),
        x_max: Math.round((box.x + box.width) / scaleRatio),
        y_max: Math.round((box.y + box.height) / scaleRatio),
        label: box.label,
        // Keep displayed coords if needed for debugging?
        // _display_x: Math.round(box.x),
        // _display_y: Math.round(box.y),
        // _display_width: Math.round(box.width),
        // _display_height: Math.round(box.height),
      })),
      labels: labels, // Save the list of possible labels too
    };
    // --- End of Modification ---

    // Optional: Log the data being sent
    console.log(
      "Saving annotations:",
      JSON.stringify(annotationsToSave, null, 2),
    );

    // --- Consider adding backend endpoint ---
    // If you have a Flask backend endpoint '/save_annotation':
    /*
    fetch("/save_annotation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(annotationsToSave), // Send the scaled data
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Annotations saved successfully!");
        } else {
          alert("Error saving annotations: " + (data.message || 'Unknown error'));
        }
      })
      .catch((error) => {
        console.error("Error saving annotations:", error);
        alert("Error saving annotations! Check console for details.");
      });
    */

    // --- For now, let's just download the JSON locally ---
    downloadJson(annotationsToSave, `${currentFilename}_annotations.json`);
    alert("Annotation JSON prepared for download."); // Provide feedback
  });

  // --- NEW: Helper function to download JSON ---
  function downloadJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2); // Pretty print JSON
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
  }

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // --- Initialize ---
  updateLabelsList(); // Initial call to set up the list area
  updateAnnotationsList(); // Initial call
});
