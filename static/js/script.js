document.addEventListener("DOMContentLoaded", function () {
  // Canvas setup
  const canvas = document.getElementById("image-canvas");
  const ctx = canvas.getContext("2d");
  let image = null;

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
  });

  moveBoxBtn.addEventListener("click", () => {
    currentTool = "move";
    moveBoxBtn.classList.add("active");
    drawBoxBtn.classList.remove("active");
  });

  // Image upload handling
  uploadBtn.addEventListener("click", () => {
    imageUpload.click();
  });

  imageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        image = new Image();
        image.onload = function () {
          // Resize canvas to fit image
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

          // Clear existing boxes
          boxes = [];
          redrawCanvas();
        };
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Canvas event listeners for drawing
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);

  function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isDrawing = true;
  }

  function handleMouseMove(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    redrawCanvas();

    // Draw current box
    ctx.strokeStyle = "#4a6cf7";
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, x - startX, y - startY);
  }

  function handleMouseUp(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - startX;
    const height = y - startY;

    if (Math.abs(width) > 10 && Math.abs(height) > 10) {
      boxes.push({
        x: width > 0 ? startX : x,
        y: height > 0 ? startY : y,
        width: Math.abs(width),
        height: Math.abs(height),
        label: labels.length > 0 ? labels[0].name : "unlabeled",
      });
      updateAnnotationsList();
    }

    isDrawing = false;
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    if (image) {
      ctx.drawImage(image, 0, 0);
    }

    // Draw all boxes
    boxes.forEach((box, index) => {
      // Find label color
      const labelObj = labels.find((l) => l.name === box.label);
      const color = labelObj ? labelObj.color : "#4a6cf7";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label text
      ctx.fillStyle = color;
      ctx.fillRect(box.x, box.y - 20, 100, 20);
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText(box.label, box.x + 5, box.y - 5);
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
      // Generate random color
      const color = getRandomColor();
      labels.push({ name: labelName, color: color });
      updateLabelsList();
      newLabelInput.value = "";
    }
  }

  function updateLabelsList() {
    labelsList.innerHTML = "";
    labels.forEach((label) => {
      const labelItem = document.createElement("div");
      labelItem.className = "label-item";

      const labelDisplay = document.createElement("div");
      labelDisplay.innerHTML = `<span class="label-color" style="background-color: ${label.color}"></span>${label.name}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => {
        labels = labels.filter((l) => l.name !== label.name);
        updateLabelsList();
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
        box.label = e.target.value;
        redrawCanvas();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => {
        boxes.splice(index, 1);
        updateAnnotationsList();
        redrawCanvas();
      };

      annotationItem.appendChild(labelSelect);
      annotationItem.appendChild(deleteBtn);
      annotationsList.appendChild(annotationItem);
    });
  }

  // Save annotations
  saveBtn.addEventListener("click", () => {
    if (boxes.length === 0) {
      alert("No annotations to save!");
      return;
    }

    const annotations = {
      boxes: boxes.map((box) => ({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: box.label,
      })),
    };

    fetch("/save_annotation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(annotations),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Annotations saved successfully!");
        } else {
          alert("Error saving annotations: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error saving annotations!");
      });
  });

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
});
