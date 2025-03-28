document.addEventListener("DOMContentLoaded", function () {
  // Configuration
  const MAX_WIDTH = 640;
  const MAX_HEIGHT = 480;
  const handleSize = 8;
  const minBoxSize = 5;

  // --- Global State for Multiple Images ---
  let imageData = []; // Array to hold data for all images
  let currentImageIndex = -1; // Index of the currently displayed image
  let image = null; // The actual Image object currently being displayed

  // State related to the *current* image (will be updated on image switch)
  let scaleRatio = 1;
  let originalWidth = 0;
  let originalHeight = 0;
  let currentFilename = "annotated_image";
  let boxes = []; // Holds annotations for the CURRENT image

  // Global labels (shared across images)
  let labels = [];

  // Interaction State
  let currentTool = "draw"; // 'draw' or 'edit'
  let isDrawing = false;
  let isResizing = false;
  let selectedBoxIndex = -1; // Index within the *current* 'boxes' array
  let grabbedHandle = null;
  let startX = 0;
  let startY = 0;

  // Canvas setup
  const canvas = document.getElementById("image-canvas");
  const ctx = canvas.getContext("2d");

  // DOM elements
  const uploadBtn = document.getElementById("upload-btn");
  const imageUpload = document.getElementById("image-upload");
  const saveBtn = document.getElementById("save-btn");
  const drawBoxBtn = document.getElementById("draw-box-btn");
  const editBoxBtn = document.getElementById("edit-box-btn"); // Ensure ID matches HTML
  const addLabelBtn = document.getElementById("add-label-btn");
  const newLabelInput = document.getElementById("new-label");
  const labelsList = document.getElementById("labels-list");
  const annotationsList = document.getElementById("annotations-list");
  // --- NEW DOM Elements ---
  const prevImageBtn = document.getElementById("prev-image-btn");
  const nextImageBtn = document.getElementById("next-image-btn");
  const imageInfoSpan = document.getElementById("image-info");

  // --- Tool Selection ---
  drawBoxBtn.addEventListener("click", () => switchTool("draw"));
  editBoxBtn.addEventListener("click", () => switchTool("edit"));

  function switchTool(tool) {
    currentTool = tool;
    if (tool === "draw") {
      drawBoxBtn.classList.add("active");
      editBoxBtn.classList.remove("active");
      canvas.style.cursor = "crosshair";
      resetEditState();
    } else {
      // edit
      editBoxBtn.classList.add("active");
      drawBoxBtn.classList.remove("active");
      canvas.style.cursor = "default";
      resetDrawState();
    }
    redrawCanvas(); // Redraw to show/hide handles
  }

  function resetDrawState() {
    isDrawing = false;
  }
  function resetEditState() {
    isResizing = false;
    selectedBoxIndex = -1;
    grabbedHandle = null;
  }

  // --- Image Upload Handling ---
  uploadBtn.addEventListener("click", () => {
    imageUpload.click();
  });

  imageUpload.addEventListener("change", (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset existing data if new files are uploaded
    imageData = [];
    currentImageIndex = -1;
    clearCanvasAndState(); // Clear display and reset UI

    let filesProcessed = 0;
    const filePromises = [];

    // Process each file
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        const loadPromise = new Promise((resolve, reject) => {
          reader.onload = function (event) {
            const img = new Image(); // Use 'img' locally, 'image' is the global current one
            img.onload = function () {
              const data = {
                src: event.target.result,
                filename: file.name,
                originalWidth: img.width,
                originalHeight: img.height,
                scaleRatio: 1,
                boxes: [], // Each image gets its own empty boxes array
                // imageObject: img // Don't store the Image object globally yet
              };

              // Calculate scale ratio for this specific image
              if (
                data.originalWidth > MAX_WIDTH ||
                data.originalHeight > MAX_HEIGHT
              ) {
                const widthRatio = MAX_WIDTH / data.originalWidth;
                const heightRatio = MAX_HEIGHT / data.originalHeight;
                data.scaleRatio = Math.min(widthRatio, heightRatio);
              }
              imageData.push(data); // Add the processed data
              resolve(); // Resolve promise for this file
            };
            img.onerror = reject; // Handle image load errors
            img.src = event.target.result;
          };
          reader.onerror = reject; // Handle file read errors
          reader.readAsDataURL(file);
        });
        filePromises.push(loadPromise);
      }
    });

    // Wait for all files to be processed
    Promise.all(filePromises)
      .then(() => {
        console.log(`Processed ${imageData.length} images.`);
        if (imageData.length > 0) {
          loadImageData(0); // Load the first image
        } else {
          updateNavigationUI(); // Update UI even if no valid images found
        }
        // Clear the input field value to allow re-uploading the same files
        imageUpload.value = null;
      })
      .catch((error) => {
        console.error("Error processing files:", error);
        alert(
          "An error occurred while loading images. Please check the console.",
        );
        updateNavigationUI();
        imageUpload.value = null;
      });
  });

  // --- NEW: Load and Display Specific Image Data ---
  function loadImageData(index) {
    if (index < 0 || index >= imageData.length) {
      console.error("Invalid image index requested:", index);
      clearCanvasAndState();
      return;
    }

    currentImageIndex = index;
    const data = imageData[currentImageIndex];

    // Update global state for the current image
    originalWidth = data.originalWidth;
    originalHeight = data.originalHeight;
    scaleRatio = data.scaleRatio;
    currentFilename = data.filename;
    boxes = data.boxes; // <<<<<< IMPORTANT: Switch to this image's boxes

    console.log(`Loading image ${currentImageIndex + 1}: ${currentFilename}`);

    // Create a new Image object for display
    image = new Image();
    image.onload = () => {
      // Calculate display dimensions
      const displayWidth = Math.round(originalWidth * scaleRatio);
      const displayHeight = Math.round(originalHeight * scaleRatio);

      // Resize canvas
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Reset interaction states
      resetDrawState();
      resetEditState();
      // Ensure the correct tool cursor is set (if needed, switchTool handles this)
      // canvas.style.cursor = (currentTool === 'draw') ? 'crosshair' : 'default';

      redrawCanvas(); // Draw the new image and its boxes
      updateAnnotationsList(); // Update the sidebar list for the new boxes
      updateNavigationUI(); // Update Prev/Next buttons and info text
    };
    image.onerror = () => {
      console.error("Error loading image source for display:", data.filename);
      alert(`Error loading image: ${data.filename}`);
      clearCanvasAndState(); // Clear canvas if image fails to load
    };
    image.src = data.src; // Set the source to trigger loading
  }

  // --- NEW: Clear canvas and reset UI ---
  function clearCanvasAndState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    image = null;
    boxes = [];
    originalWidth = 0;
    originalHeight = 0;
    scaleRatio = 1;
    currentFilename = "annotated_image";
    currentImageIndex = -1; // Reset index
    resetDrawState();
    resetEditState();
    updateAnnotationsList(); // Clear annotation list
    updateNavigationUI(); // Update buttons/info
    console.log("Canvas and state cleared.");
  }

  // --- NEW: Update Navigation UI Elements ---
  function updateNavigationUI() {
    if (imageData.length === 0) {
      imageInfoSpan.textContent = "No images loaded";
      prevImageBtn.disabled = true;
      nextImageBtn.disabled = true;
    } else {
      imageInfoSpan.textContent = `${currentImageIndex + 1} / ${imageData.length} (${imageData[currentImageIndex].filename})`;
      prevImageBtn.disabled = currentImageIndex <= 0;
      nextImageBtn.disabled = currentImageIndex >= imageData.length - 1;
    }
  }

  // --- NEW: Navigation Button Listeners ---
  prevImageBtn.addEventListener("click", () => {
    if (currentImageIndex > 0) {
      loadImageData(currentImageIndex - 1);
    }
  });

  nextImageBtn.addEventListener("click", () => {
    if (currentImageIndex < imageData.length - 1) {
      loadImageData(currentImageIndex + 1);
    }
  });

  // --- Canvas Event Listeners (Mostly Unchanged Logic, operates on current `boxes`) ---
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseLeave);

  function getMousePos(e) {
    /* ... no changes ... */
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function getHandleUnderMouse(x, y) {
    /* ... no changes needed, operates on current boxes ... */
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      const hs = handleSize / 2;
      if (
        x >= box.x - hs &&
        x <= box.x + hs &&
        y >= box.y - hs &&
        y <= box.y + hs
      )
        return { boxIndex: i, handle: "tl" };
      if (
        x >= box.x + box.width - hs &&
        x <= box.x + box.width + hs &&
        y >= box.y - hs &&
        y <= box.y + hs
      )
        return { boxIndex: i, handle: "tr" };
      if (
        x >= box.x - hs &&
        x <= box.x + hs &&
        y >= box.y + box.height - hs &&
        y <= box.y + box.height + hs
      )
        return { boxIndex: i, handle: "bl" };
      if (
        x >= box.x + box.width - hs &&
        x <= box.x + box.width + hs &&
        y >= box.y + box.height - hs &&
        y <= box.y + box.height + hs
      )
        return { boxIndex: i, handle: "br" };
    }
    return null;
  }

  function handleMouseDown(e) {
    /* ... no changes needed, uses global state ... */
    if (!image) return; // Check if an image is loaded
    const pos = getMousePos(e);
    startX = pos.x;
    startY = pos.y;
    if (currentTool === "draw") {
      isDrawing = true;
      resetEditState();
    } else if (currentTool === "edit") {
      resetDrawState();
      const handleInfo = getHandleUnderMouse(pos.x, pos.y);
      if (handleInfo) {
        isResizing = true;
        selectedBoxIndex = handleInfo.boxIndex;
        grabbedHandle = handleInfo.handle;
      } else {
        resetEditState();
        redrawCanvas();
      }
    }
  }

  function handleMouseMove(e) {
    /* ... no changes needed, uses global state ... */
    if (!image) return;
    const pos = getMousePos(e);
    const currentX = pos.x;
    const currentY = pos.y;

    if (currentTool === "draw" && isDrawing) {
      redrawCanvas();
      ctx.strokeStyle = "#4a6cf7";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    } else if (currentTool === "edit" && isResizing) {
      const box = boxes[selectedBoxIndex];
      let newX = box.x,
        newY = box.y,
        newWidth = box.width,
        newHeight = box.height;
      switch (grabbedHandle) {
        case "tl":
          newWidth = box.x + box.width - currentX;
          newHeight = box.y + box.height - currentY;
          newX = currentX;
          newY = currentY;
          break;
        case "tr":
          newWidth = currentX - box.x;
          newHeight = box.y + box.height - currentY;
          newY = currentY;
          break;
        case "bl":
          newWidth = box.x + box.width - currentX;
          newHeight = currentY - box.y;
          newX = currentX;
          break;
        case "br":
          newWidth = currentX - box.x;
          newHeight = currentY - box.y;
          break;
      }
      box.x = newX;
      box.y = newY;
      box.width = newWidth;
      box.height = newHeight;
      redrawCanvas();
    } else if (currentTool === "edit" && !isResizing) {
      const handleInfo = getHandleUnderMouse(currentX, currentY);
      if (handleInfo) {
        switch (handleInfo.handle) {
          case "tl":
          case "br":
            canvas.style.cursor = "nwse-resize";
            break;
          case "tr":
          case "bl":
            canvas.style.cursor = "nesw-resize";
            break;
          default:
            canvas.style.cursor = "default";
            break;
        }
      } else {
        canvas.style.cursor = "default";
      }
    }
  }

  function handleMouseUp(e) {
    /* ... no changes needed, uses global state ... */
    if (currentTool === "draw" && isDrawing) {
      isDrawing = false;
      const pos = getMousePos(e);
      const endX = pos.x;
      const endY = pos.y;
      const width = endX - startX;
      const height = endY - startY;
      if (Math.abs(width) >= minBoxSize && Math.abs(height) >= minBoxSize) {
        const newBox = {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(width),
          height: Math.abs(height),
          label: labels.length > 0 ? labels[0].name : "unlabeled",
        };
        // IMPORTANT: Add to the *current* image's boxes
        imageData[currentImageIndex].boxes.push(newBox);
        updateAnnotationsList();
      }
      redrawCanvas();
    } else if (currentTool === "edit" && isResizing) {
      const box = boxes[selectedBoxIndex]; // Get current box
      if (box) {
        // Check if box exists (might have been deleted)
        if (box.width < 0) {
          box.x += box.width;
          box.width = Math.abs(box.width);
        }
        if (box.height < 0) {
          box.y += box.height;
          box.height = Math.abs(box.height);
        }
        box.width = Math.max(minBoxSize, box.width);
        box.height = Math.max(minBoxSize, box.height);
      }
      resetEditState();
      redrawCanvas();
      updateAnnotationsList();
    }
  }

  function handleMouseLeave(e) {
    /* ... no changes needed, uses global state ... */
    if (isDrawing) {
      isDrawing = false;
      redrawCanvas();
    }
    if (isResizing) {
      const box = boxes[selectedBoxIndex];
      if (box) {
        if (box.width < 0) {
          box.x += box.width;
          box.width = Math.abs(box.width);
        }
        if (box.height < 0) {
          box.y += box.height;
          box.height = Math.abs(box.height);
        }
        box.width = Math.max(minBoxSize, box.width);
        box.height = Math.max(minBoxSize, box.height);
      }
      resetEditState();
      redrawCanvas();
      updateAnnotationsList();
      canvas.style.cursor = "default";
    } else if (currentTool === "edit") {
      canvas.style.cursor = "default";
    }
  }

  // --- redrawCanvas (Operates on current `image` and `boxes`) ---
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw current image (if loaded)
    if (image) {
      // Check canvas size just in case
      const expectedWidth = Math.round(originalWidth * scaleRatio);
      const expectedHeight = Math.round(originalHeight * scaleRatio);
      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else {
      // Optionally draw a placeholder if no image is loaded
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#888";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Upload images to begin",
        canvas.width / 2,
        canvas.height / 2,
      );
      return; // Don't draw boxes if no image
    }

    // Draw boxes for the CURRENT image
    boxes.forEach((box, index) => {
      const labelObj = labels.find((l) => l.name === box.label);
      const color = labelObj ? labelObj.color : "#CCCCCC";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label text
      if (box.label) {
        /* ... no changes ... */
        ctx.fillStyle = color;
        const text = box.label;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        ctx.fillRect(box.x, box.y - 16, textWidth + 10, 16);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(text, box.x + 5, box.y - 4);
      }

      // Draw resize handles if in edit mode
      if (currentTool === "edit") {
        /* ... no changes ... */
        ctx.fillStyle = color;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        const hs = handleSize / 2;
        ctx.fillRect(box.x - hs, box.y - hs, handleSize, handleSize);
        ctx.strokeRect(box.x - hs, box.y - hs, handleSize, handleSize);
        ctx.fillRect(
          box.x + box.width - hs,
          box.y - hs,
          handleSize,
          handleSize,
        );
        ctx.strokeRect(
          box.x + box.width - hs,
          box.y - hs,
          handleSize,
          handleSize,
        );
        ctx.fillRect(
          box.x - hs,
          box.y + box.height - hs,
          handleSize,
          handleSize,
        );
        ctx.strokeRect(
          box.x - hs,
          box.y + box.height - hs,
          handleSize,
          handleSize,
        );
        ctx.fillRect(
          box.x + box.width - hs,
          box.y + box.height - hs,
          handleSize,
          handleSize,
        );
        ctx.strokeRect(
          box.x + box.width - hs,
          box.y + box.height - hs,
          handleSize,
          handleSize,
        );
      }
    });
  }

  // --- Label Management (Labels are Global) ---
  addLabelBtn.addEventListener("click", addNewLabel);
  newLabelInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewLabel();
    }
  });

  function addNewLabel() {
    /* ... Mostly unchanged, applies globally ... */
    const labelName = newLabelInput.value.trim();
    if (labelName && !labels.some((l) => l.name === labelName)) {
      const color = getRandomColor();
      labels.push({ name: labelName, color: color });
      updateLabelsList();
      updateAnnotationsList(); // Refresh annotations in case selects need updating
      // Assign to unlabeled boxes *on the current image* only? Or all? Let's do current only for now.
      if (labels.length === 1 && currentImageIndex !== -1) {
        imageData[currentImageIndex].boxes.forEach((box) => {
          if (box.label === "unlabeled") {
            box.label = labelName;
          }
        });
        redrawCanvas();
        updateAnnotationsList();
      }
      newLabelInput.value = "";
    } else if (!labelName) {
      alert("Please enter a label name.");
    } else {
      alert(`Label "${labelName}" already exists.`);
    }
  }

  function updateLabelsList() {
    /* ... Unchanged, operates on global labels ... */
    labelsList.innerHTML = "";
    labels.forEach((label, index) => {
      const labelItem = document.createElement("div");
      labelItem.className = "label-item";
      labelItem.style.cursor = "pointer";
      const labelDisplay = document.createElement("div");
      labelDisplay.innerHTML = `<span class="label-color" style="background-color: ${label.color}"></span>${label.name}`;
      labelItem.onclick = () => {
        console.log(
          `Selected ${label.name} as default for next box (if unlabeled).`,
        );
      };
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn delete-label-btn";
      deleteBtn.textContent = "X";
      deleteBtn.title = `Delete label "${label.name}"`;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        const labelNameToDelete = label.name;
        labels.splice(index, 1); // Remove from global list

        // --- NEW: Update boxes across ALL images ---
        imageData.forEach((imgData) => {
          imgData.boxes.forEach((box) => {
            if (box.label === labelNameToDelete) {
              box.label = labels.length > 0 ? labels[0].name : "unlabeled";
            }
          });
        });
        updateLabelsList();
        updateAnnotationsList();
        redrawCanvas(); // Update current view
      };
      labelItem.appendChild(labelDisplay);
      labelItem.appendChild(deleteBtn);
      labelsList.appendChild(labelItem);
    });
  }

  // --- updateAnnotationsList (Operates on current `boxes`) ---
  function updateAnnotationsList() {
    annotationsList.innerHTML = ""; // Clear current list
    // Use the 'boxes' array which points to the current image's annotations
    boxes.forEach((box, index) => {
      const annotationItem = document.createElement("div");
      annotationItem.className = "annotation-item";
      const labelSelect = document.createElement("select");
      labelSelect.className = "annotation-label-select";
      // Populate select options (unchanged logic)
      if (
        labels.length === 0 ||
        box.label === "unlabeled" ||
        !labels.some((l) => l.name === box.label)
      ) {
        /* ... add unlabeled option ... */
        const option = document.createElement("option");
        option.value = "unlabeled";
        option.textContent = "unlabeled";
        option.selected =
          box.label === "unlabeled" ||
          !labels.some((l) => l.name === box.label);
        labelSelect.appendChild(option);
      }
      labels.forEach((label) => {
        /* ... add label options ... */
        const option = document.createElement("option");
        option.value = label.name;
        option.textContent = label.name;
        if (box.label === label.name) {
          option.selected = true;
        }
        labelSelect.appendChild(option);
      });
      // Update the specific box in the current image's array
      labelSelect.onchange = (e) => {
        imageData[currentImageIndex].boxes[index].label = e.target.value;
        redrawCanvas();
      };
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn delete-annotation-btn";
      deleteBtn.textContent = "X";
      deleteBtn.title = "Delete this annotation";
      deleteBtn.onclick = () => {
        // If deleting the box being edited, reset edit state
        if (isResizing && selectedBoxIndex === index) {
          resetEditState();
          canvas.style.cursor = "default";
        }
        // Remove from the *current* image's boxes array
        imageData[currentImageIndex].boxes.splice(index, 1);
        // Adjust selectedBoxIndex if needed
        if (selectedBoxIndex > index) {
          selectedBoxIndex--;
        } else if (selectedBoxIndex === index) {
          resetEditState();
          canvas.style.cursor = "default";
        }
        updateAnnotationsList(); // Refresh list
        redrawCanvas(); // Redraw canvas
      };
      annotationItem.appendChild(labelSelect);
      annotationItem.appendChild(deleteBtn);
      annotationsList.appendChild(annotationItem);
    });
  }

  // --- MODIFIED: Save annotations for ALL images ---
  saveBtn.addEventListener("click", () => {
    if (imageData.length === 0) {
      alert("No images or annotations to save!");
      return;
    }

    const allAnnotations = {
      // Store global labels once
      labels: labels,
      // Store annotations grouped by image
      annotations_by_image: imageData.map((imgData) => ({
        image_filename: imgData.filename,
        image_width: imgData.originalWidth,
        image_height: imgData.originalHeight,
        // Scale boxes back to original dimensions for this image
        boxes: imgData.boxes.map((box) => ({
          x_min: Math.round(box.x / imgData.scaleRatio),
          y_min: Math.round(box.y / imgData.scaleRatio),
          x_max: Math.round((box.x + box.width) / imgData.scaleRatio),
          y_max: Math.round((box.y + box.height) / imgData.scaleRatio),
          label: box.label,
        })),
      })),
    };

    console.log(
      "Saving all annotations:",
      JSON.stringify(allAnnotations, null, 2),
    );
    downloadJson(allAnnotations, `all_annotations.json`); // Use a general filename
    alert("Annotation JSON for all images prepared for download.");
  });

  function downloadJson(data, filename) {
    /* ... no changes ... */
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function getRandomColor() {
    /* ... no changes ... */
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // --- Initialize ---
  updateLabelsList();
  updateAnnotationsList(); // Initially empty
  updateNavigationUI(); // Set initial state of navigation
  switchTool("draw"); // Start in draw mode
  redrawCanvas(); // Draw placeholder initially
});
