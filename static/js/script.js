document.addEventListener("DOMContentLoaded", function () {
  // Configuration
  const MAX_WIDTH = 640;
  const MAX_HEIGHT = 480;
  let scaleRatio = 1;
  let originalWidth = 0;
  let originalHeight = 0;
  let currentFilename = "annotated_image";

  // Canvas setup
  const canvas = document.getElementById("image-canvas");
  const ctx = canvas.getContext("2d");
  let image = null;

  // State
  let boxes = [];
  let labels = [];
  let currentTool = "draw"; // 'draw' or 'edit'
  let isDrawing = false; // For drawing new boxes
  let isResizing = false; // --- NEW: For resizing existing boxes ---
  let selectedBoxIndex = -1; // --- NEW: Index of the box being resized ---
  let grabbedHandle = null; // --- NEW: Which handle is grabbed ('tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r') ---
  let startX = 0;
  let startY = 0;
  const handleSize = 8; // --- NEW: Size of the clickable resize handles ---
  const minBoxSize = 5; // Minimum width/height for a box

  // DOM elements
  const uploadBtn = document.getElementById("upload-btn");
  const imageUpload = document.getElementById("image-upload");
  const saveBtn = document.getElementById("save-btn");
  const drawBoxBtn = document.getElementById("draw-box-btn");

  const editBoxBtn = document.getElementById("edit-box-btn");
  const addLabelBtn = document.getElementById("add-label-btn");
  const newLabelInput = document.getElementById("new-label");
  const labelsList = document.getElementById("labels-list");
  const annotationsList = document.getElementById("annotations-list");

  // --- Tool selection ---
  drawBoxBtn.addEventListener("click", () => {
    currentTool = "draw";
    drawBoxBtn.classList.add("active");
    editBoxBtn.classList.remove("active");
    canvas.style.cursor = "crosshair";
    resetEditState(); // --- NEW: Reset edit state when switching tool ---
    redrawCanvas(); // --- NEW: Redraw to remove handles ---
  });

  // --- RENAME: Renamed the event listener conceptually ---
  editBoxBtn.addEventListener("click", () => {
    currentTool = "edit"; // --- CHANGED from 'move' ---
    editBoxBtn.classList.add("active");
    drawBoxBtn.classList.remove("active");
    canvas.style.cursor = "default"; // Default cursor, will change on hover
    resetDrawState(); // --- NEW: Reset draw state ---
    redrawCanvas(); // --- NEW: Redraw to potentially show handles ---
  });

  // Set initial cursor
  canvas.style.cursor = "crosshair";

  // --- NEW Helper Functions for State Reset ---
  function resetDrawState() {
    isDrawing = false;
  }
  function resetEditState() {
    isResizing = false;
    selectedBoxIndex = -1;
    grabbedHandle = null;
  }
  // ---

  // Image upload handling (no changes needed here)
  uploadBtn.addEventListener("click", () => {
    imageUpload.click();
  });
  imageUpload.addEventListener("change", (e) => {
    /* ... existing code ... */
    const file = e.target.files[0];
    if (file) {
      currentFilename = file.name.split(".")[0];
      const reader = new FileReader();
      reader.onload = function (event) {
        image = new Image();
        image.onload = function () {
          originalWidth = image.width;
          originalHeight = image.height;
          scaleRatio = 1;
          if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
            const widthRatio = MAX_WIDTH / originalWidth;
            const heightRatio = MAX_HEIGHT / originalHeight;
            scaleRatio = Math.min(widthRatio, heightRatio);
          }
          const displayWidth = Math.round(originalWidth * scaleRatio);
          const displayHeight = Math.round(originalHeight * scaleRatio);
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

          // Clear state on new image
          boxes = [];
          resetDrawState();
          resetEditState();
          redrawCanvas();
          updateAnnotationsList();
          // Switch back to draw tool by default
          currentTool = "draw";
          drawBoxBtn.classList.add("active");
          editBoxBtn.classList.remove("active");
          canvas.style.cursor = "crosshair";
        };
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // --- Canvas Event Listeners ---
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseLeave); // Keep this

  // --- Gets the current mouse position relative to the canvas ---
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // --- NEW: Function to check if mouse is over a resize handle ---
  function getHandleUnderMouse(x, y) {
    // Check in reverse order so topmost boxes are checked first
    for (let i = boxes.length - 1; i >= 0; i--) {
      const box = boxes[i];
      const hs = handleSize / 2; // Use half handleSize for center check

      // Corner handles (more important)
      if (
        x >= box.x - hs &&
        x <= box.x + hs &&
        y >= box.y - hs &&
        y <= box.y + hs
      )
        return { boxIndex: i, handle: "tl" }; // Top-left
      if (
        x >= box.x + box.width - hs &&
        x <= box.x + box.width + hs &&
        y >= box.y - hs &&
        y <= box.y + hs
      )
        return { boxIndex: i, handle: "tr" }; // Top-right
      if (
        x >= box.x - hs &&
        x <= box.x + hs &&
        y >= box.y + box.height - hs &&
        y <= box.y + box.height + hs
      )
        return { boxIndex: i, handle: "bl" }; // Bottom-left
      if (
        x >= box.x + box.width - hs &&
        x <= box.x + box.width + hs &&
        y >= box.y + box.height - hs &&
        y <= box.y + box.height + hs
      )
        return { boxIndex: i, handle: "br" }; // Bottom-right
    }
    return null; // No handle found
  }

  // --- MODIFIED: handleMouseDown ---
  function handleMouseDown(e) {
    if (!image) return;
    const pos = getMousePos(e);
    startX = pos.x;
    startY = pos.y;

    if (currentTool === "draw") {
      isDrawing = true;
      resetEditState(); // Ensure no lingering edit state
    } else if (currentTool === "edit") {
      resetDrawState(); // Ensure no lingering draw state
      const handleInfo = getHandleUnderMouse(pos.x, pos.y);
      if (handleInfo) {
        isResizing = true;
        selectedBoxIndex = handleInfo.boxIndex;
        grabbedHandle = handleInfo.handle;
        // Optional: Prevent browser default drag behavior if needed
        // e.preventDefault();
      } else {
        // If not clicking a handle, potentially select a box for moving later (not implemented yet)
        // Or deselect all
        resetEditState();
        redrawCanvas(); // Redraw to remove any selection highlights if implemented
      }
    }
  }

  // --- MODIFIED: handleMouseMove ---
  function handleMouseMove(e) {
    if (!image) return;
    const pos = getMousePos(e);
    const currentX = pos.x;
    const currentY = pos.y;

    // --- Drawing new box ---
    if (currentTool === "draw" && isDrawing) {
      redrawCanvas(); // Redraw the image and existing boxes first
      // Draw the new box being created
      ctx.strokeStyle = "#4a6cf7";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
    // --- Resizing existing box ---
    else if (currentTool === "edit" && isResizing) {
      const box = boxes[selectedBoxIndex];
      let newX = box.x;
      let newY = box.y;
      let newWidth = box.width;
      let newHeight = box.height;

      // Adjust based on the handle being dragged
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
        // Add cases for 't', 'b', 'l', 'r' if edge handles are enabled
      }

      // Update box, allowing temporary negative dimensions
      box.x = newX;
      box.y = newY;
      box.width = newWidth;
      box.height = newHeight;

      redrawCanvas(); // Redraw everything with the updated box
    }
    // --- Changing cursor based on hover when in edit mode ---
    else if (currentTool === "edit" && !isResizing) {
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
          // Add cases for 't', 'b' (ns-resize) and 'l', 'r' (ew-resize) if edge handles are enabled
          default:
            canvas.style.cursor = "default";
            break;
        }
      } else {
        canvas.style.cursor = "default"; // Default cursor if not over a handle
      }
    }
  }

  // --- MODIFIED: handleMouseUp ---
  function handleMouseUp(e) {
    // --- Finalize Drawing ---
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
        boxes.push(newBox);
        updateAnnotationsList();
      }
      redrawCanvas();
    }
    // --- Finalize Resizing ---
    else if (currentTool === "edit" && isResizing) {
      const box = boxes[selectedBoxIndex];

      // --- Normalize box coordinates ---
      // Ensure x, y are top-left and width, height are positive
      if (box.width < 0) {
        box.x = box.x + box.width;
        box.width = Math.abs(box.width);
      }
      if (box.height < 0) {
        box.y = box.y + box.height;
        box.height = Math.abs(box.height);
      }

      // --- Enforce minimum size ---
      if (box.width < minBoxSize) {
        box.width = minBoxSize;
        // Add logic here if you need to decide how to adjust x when min width is enforced
      }
      if (box.height < minBoxSize) {
        box.height = minBoxSize;
        // Add logic here if you need to decide how to adjust y when min height is enforced
      }

      resetEditState(); // Reset resizing flags
      redrawCanvas(); // Draw the final normalized box
      updateAnnotationsList(); // Update list if coords were shown
    }
  }

  // --- MODIFIED: handleMouseLeave ---
  function handleMouseLeave(e) {
    // If drawing, cancel it
    if (isDrawing) {
      isDrawing = false;
      redrawCanvas();
    }
    // If resizing, finalize it (like mouseup)
    if (isResizing) {
      // Get the box reference before resetting state
      const box = boxes[selectedBoxIndex];
      if (box) {
        // Normalize box coordinates
        if (box.width < 0) {
          box.x += box.width;
          box.width = Math.abs(box.width);
        }
        if (box.height < 0) {
          box.y += box.height;
          box.height = Math.abs(box.height);
        }
        // Enforce minimum size
        box.width = Math.max(minBoxSize, box.width);
        box.height = Math.max(minBoxSize, box.height);
      }
      resetEditState();
      redrawCanvas();
      updateAnnotationsList();
      canvas.style.cursor = "default"; // Reset cursor as mouse left
    } else if (currentTool === "edit") {
      canvas.style.cursor = "default"; // Reset cursor if just hovering
    }
  }

  // --- MODIFIED: redrawCanvas ---
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    if (image) {
      if (
        canvas.width !== Math.round(originalWidth * scaleRatio) ||
        canvas.height !== Math.round(originalHeight * scaleRatio)
      ) {
        canvas.width = Math.round(originalWidth * scaleRatio);
        canvas.height = Math.round(originalHeight * scaleRatio);
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    // Draw boxes
    boxes.forEach((box, index) => {
      const labelObj = labels.find((l) => l.name === box.label);
      const color = labelObj ? labelObj.color : "#CCCCCC";

      // Draw the main box rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label text
      if (box.label) {
        ctx.fillStyle = color;
        const text = box.label;
        const textMetrics = ctx.measureText(text); // Use measureText for better width
        const textWidth = textMetrics.width;
        ctx.fillRect(box.x, box.y - 16, textWidth + 10, 16);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(text, box.x + 5, box.y - 4);
      }

      // --- NEW: Draw resize handles if in edit mode ---
      if (currentTool === "edit") {
        ctx.fillStyle = color; // Use label color for handles
        ctx.strokeStyle = "white"; // White outline for visibility
        ctx.lineWidth = 1;
        const hs = handleSize / 2;

        // Draw corner handles
        ctx.fillRect(box.x - hs, box.y - hs, handleSize, handleSize); // tl
        ctx.strokeRect(box.x - hs, box.y - hs, handleSize, handleSize);
        ctx.fillRect(
          box.x + box.width - hs,
          box.y - hs,
          handleSize,
          handleSize,
        ); // tr
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
        ); // bl
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
        ); // br
        ctx.strokeRect(
          box.x + box.width - hs,
          box.y + box.height - hs,
          handleSize,
          handleSize,
        );

        // Optional: Draw edge handles (uncomment if needed and enable in getHandleUnderMouse)
        // ctx.fillRect(box.x + box.width/2 - hs, box.y - hs, handleSize, handleSize); // t
        // ctx.strokeRect(box.x + box.width/2 - hs, box.y - hs, handleSize, handleSize);
        // ctx.fillRect(box.x + box.width/2 - hs, box.y + box.height - hs, handleSize, handleSize); // b
        // ctx.strokeRect(box.x + box.width/2 - hs, box.y + box.height - hs, handleSize, handleSize);
        // ctx.fillRect(box.x - hs, box.y + box.height/2 - hs, handleSize, handleSize); // l
        // ctx.strokeRect(box.x - hs, box.y + box.height/2 - hs, handleSize, handleSize);
        // ctx.fillRect(box.x + box.width - hs, box.y + box.height/2 - hs, handleSize, handleSize); // r
        // ctx.strokeRect(box.x + box.width - hs, box.y + box.height/2 - hs, handleSize, handleSize);
      }
    });
  }

  // --- Label Management --- (No changes needed here)
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
      updateAnnotationsList();
      if (labels.length === 1) {
        boxes.forEach((box) => {
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
        labels.splice(index, 1);
        boxes.forEach((box) => {
          if (box.label === labelNameToDelete) {
            box.label = labels.length > 0 ? labels[0].name : "unlabeled";
          }
        });
        updateLabelsList();
        updateAnnotationsList();
        redrawCanvas();
      };
      labelItem.appendChild(labelDisplay);
      labelItem.appendChild(deleteBtn);
      labelsList.appendChild(labelItem);
    });
  }
  function updateAnnotationsList() {
    annotationsList.innerHTML = "";
    boxes.forEach((box, index) => {
      const annotationItem = document.createElement("div");
      annotationItem.className = "annotation-item";
      const labelSelect = document.createElement("select");
      labelSelect.className = "annotation-label-select";
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
      labels.forEach((label) => {
        const option = document.createElement("option");
        option.value = label.name;
        option.textContent = label.name;
        if (box.label === label.name) {
          option.selected = true;
        }
        labelSelect.appendChild(option);
      });
      labelSelect.onchange = (e) => {
        boxes[index].label = e.target.value;
        redrawCanvas();
      };
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn delete-annotation-btn";
      deleteBtn.textContent = "X";
      deleteBtn.title = "Delete this annotation";
      deleteBtn.onclick = () => {
        // --- NEW: If deleting the box being edited, reset edit state ---
        if (isResizing && selectedBoxIndex === index) {
          resetEditState();
          canvas.style.cursor = "default"; // Reset cursor
        }
        boxes.splice(index, 1);
        // Adjust selectedBoxIndex if deleting a box before the selected one
        if (selectedBoxIndex > index) {
          selectedBoxIndex--;
        } else if (selectedBoxIndex === index) {
          // If we deleted the selected box itself (not during resize)
          resetEditState();
          canvas.style.cursor = "default";
        }
        updateAnnotationsList();
        redrawCanvas();
      };
      annotationItem.appendChild(labelSelect);
      annotationItem.appendChild(deleteBtn);
      annotationsList.appendChild(annotationItem);
    });
  }

  // --- Save annotations --- (No changes needed here)
  saveBtn.addEventListener("click", () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }
    if (boxes.length === 0) {
      alert("No annotations to save!");
      return;
    }
    const annotationsToSave = {
      image_filename: currentFilename + ".jpg",
      image_width: originalWidth,
      image_height: originalHeight,
      boxes: boxes.map((box) => ({
        x_min: Math.round(box.x / scaleRatio),
        y_min: Math.round(box.y / scaleRatio),
        x_max: Math.round((box.x + box.width) / scaleRatio),
        y_max: Math.round((box.y + box.height) / scaleRatio),
        label: box.label,
      })),
      labels: labels,
    };
    console.log(
      "Saving annotations:",
      JSON.stringify(annotationsToSave, null, 2),
    );
    downloadJson(annotationsToSave, `${currentFilename}_annotations.json`);
    alert("Annotation JSON prepared for download.");
  });
  function downloadJson(data, filename) {
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
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // --- Initialize ---
  updateLabelsList();
  updateAnnotationsList();
});
