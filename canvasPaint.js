
// processes all mouse event happening inside the drawing arrea
// keeps track of selected tool and current state
const eventManager = {
    // pen tool is selected by default
    tool: "pen",
    
    // edit of shapes require to keep track of states between events
    edit: "",
    
    // hecks currently selected tool and redirects the event to the appropiate function
    processEvent: function(event) {
        // check current tool
        const newTool = document.querySelector("input[type=radio]:checked").value;
        
        // tool changes require some cleanup
        if (newTool !== eventManager.tool) {
            eventManager.tool = newTool;
            editBoxManager.deleteBoxes();
        }
        
        // delegate event to appropiate function
        switch (newTool) {
            case "pen": eventManager.processPenEvent(event); break;
            case "pain": eventManager.processPaintEvent(event); break;
            case "line":
            case "circle":
            case "square": eventManager.processShapeEvent(event); break;
        }
        event.stopPropagation();
    }, 
    
    processPenEvent: function(event) {
        const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);
        
        switch(event.type){
            case "mousedown":
                undoRedoManager.addUndo();
                drawingManager.drawPen(x, y, true);
                break;
            case "mousemove":
                if (event.buttons !== 0) {
                    drawingManager.drawPen(x, y);
                }
                break;
        }
    },
    
    processShapeEvent: function(event) {
        // get current cursor coordinates and selected tool
        const [x, y] = coordinatesManager.updateCoordinates(event.clientX, event.clientY);
        const tool = this.tool;
              
        switch(event.type){
            case "mousedown":                
                // check if mousedown was on resize box
                const source = event.srcElement;
                this.resize = source.id === "canvas" ? "" : source.id 
                
                if (this.resize) {
                    // redraw current shape
                    drawingManager.drawShape(this.tool, x, y, this.resize);
                } else {
                    // cleanup and start new shape
                    editBoxManager.deleteBoxes();
                    undoRedoManager.addUndo();
                    drawingManager.drawShape(this.tool, x, y, "end", true);  
                }                
                break;
            case "mousemove":                
                if (event.buttons !== 0) {
                    undoRedoManager.softUndo();
                    if (this.resize) {
                        // make resize boxes follow cursor and redraw shape                        
                        drawingManager.drawShape(this.tool, x, y, this.resize);
                        editBoxManager.moveBoxes();
                    } else {
                        // redraw current shape
                        drawingManager.drawShape(this.tool, x, y);
                    }
                }
                break;
            case "mouseup":
                // if not resizing create resize boxes
                if (!this.resize) {                    
                    // make sure click event happened on different coordinates before creating boxes
                    if (drawingManager.start.toString() !== drawingManager.end.toString()) {
                        editBoxManager.createBoxes();
                    }
                }
                break;
        }
    },
        
    processPaintEvent: function(event) {},
};

// draws on the canvas
const drawingManager = {
    // render context of the canvas used fro drawing            
    ctx: undefined,
    
    // start, end and center coordinates of the current drawing
    // used on shapes like line, square and circle
    start: [0, 0],
    end: [0, 0],
    center: [0, 0],
    
    drawPen: function(x, y, begin = false){
        if (begin) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);            
        }
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    },    
    drawShape: function(tool, x, y, position = "end", isBeginning = false) {
        // update shape start on mouse down
        if (isBeginning) {
            this.start = [x, y];
            this.center = [x, y];
        }
        // update shape start, end or both positions depending on what is being edited
        if (position === "center") {
            //get diff in x and y coordinates due to centere move
            const [lastX, lastY] = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2];
            const [diffX, diffY] = [x - lastX, y - lastY]
            //update all coordinates
            this.start = [this.start[0] + diffX, this.start[1] + diffY];
            this.end = [this.end[0] + diffX, this.end[1] + diffY];
            this.center = [x, y];            
        } else {
            // only update the edited position and recalculate center
            this[position] = [x, y];
            this.center = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2]
        }
        
        switch (tool) { 
            case "line": this.drawLine(); break;
            case "square": this.drawSquare(); break;
            case "circle": this.drawCircle(); break;
        }
    },    
    drawLine: function() {               
        this.ctx.beginPath();
        this.ctx.moveTo(this.start[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.end[1]);
        this.ctx.stroke();
    },
    drawSquare: function() {  
        this.ctx.beginPath();
        this.ctx.moveTo(this.start[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.end[1]);
        this.ctx.lineTo(this.start[0], this.end[1]);
        this.ctx.lineTo(this.start[0], this.start[1]);
        this.ctx.stroke();
    },
    drawCircle: function() {
        console.log("DRAWING CIRCLE!!!");
        // find the center and radii of the elipse
        const [cX, cY] = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2];
        const [rX, rY] = [Math.abs(this.start[0] - cX), Math.abs(this.start[1] - cY)];
        this.ctx.beginPath();
        this.ctx.ellipse(cX, cY, rX, rY, 0, 0, Math.PI * 2);
        this.ctx.stroke();        
    },
};

// stores and updates the x/y coordinates of the cursor on the canvas
const coordinatesManager = {
    //current coordiantes of the cursor on client
    x: 0,
    y: 0,
    
    // position of canvas on client
    offsetX: 0,
    offsetY: 0,
    
    // updates internal coordinates and displays them on screen
    updateCoordinates: function(cursorX, cursorY){
        // update coordinates to the cursor
        this.x = cursorX - this.offsetX;
        this.y = cursorY - this.offsetY;
        
        // update the coordinates indicator as well
        document.getElementById("xy-cursor").innerText = this.x + " x " + this.y + " px";
        
        // return new coordiantes
        return [this.x, this.y];
    },
};

// stores and mantains the undo/redo stack
const undoRedoManager = {
    // size and render context of the canvas
    ctx: undefined,
    size: [0, 0],
    
    // stacks holding the images to undo/redo
    undoStack: [],    
    redoStack: [],    
    
    // pushes current image into undo stack, enables button and cleans redo stack
    addUndo: function(item){
        this.undoStack.push(this.ctx.getImageData(0, 0, 700, 400));
        document.getElementById("undo-button").removeAttribute("disabled");
        this.redoStack = [];   
        document.getElementById("redo-button").setAttribute("disabled","");
    },
    
    // functions that perform the undo redo logic
    undo: function(){        
        // clean resize boxes if existent
        editBoxManager.deleteBoxes();
        
        // add about to be undoed image to redo stack and enable button
        const currentImage = this.ctx.getImageData(0, 0, this.size[0], this.size[1]);
        this.redoStack.push(currentImage);                
        document.getElementById("redo-button").removeAttribute("disabled");
        
        // pop element from stack and restore canvas
        const lastImage = this.undoStack.pop();        
        this.ctx.putImageData(lastImage, 0, 0);
        
        // disable undo button if needed
        if (!this.undoStack.length) { 
            document.getElementById("undo-button").setAttribute("disabled","");
        }                
    }, 
    softUndo: function () {
        // soft undo is constantly called by the shape functions when being redrawn
        // similar to regular undo but doesn't alter the stacks
        this.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);    
        return;
    },
    redo: function(){
        // add about to be redoed image to undo stack and enable button
        const currentImage = this.ctx.getImageData(0, 0, this.size[0], this.size[1]);
        this.undoStack.push(currentImage);                
        document.getElementById("undo-button").removeAttribute("disabled");
        
        // pop element from stack and restore canvas
        const lastImage = this.redoStack.pop();        
        this.ctx.putImageData(lastImage, 0, 0);
        
        // disable redo button if needed
        if (!this.redoStack.length) { 
            document.getElementById("redo-button").setAttribute("disabled","");
        }
    },
};

// stores and maintains the edit boxes that are created for shapes
const editBoxManager = {
    boxes: [],
    
    // creates 2 resize boxes at start and end point and 1 move box at shape center
    createBoxes: function() {
        const params = [["start", "resize"], ["end", "resize"], ["center", "move"]]
        params.forEach(([position, type]) => {
            // create box
            const editBox = document.createElement("div");        
            editBox.id = position;
            editBox.className = type + "-box";        

            // push it to the  desired position (7.5 = main padding - half box size)
            const [x, y] = drawingManager[position]    
            editBox.style.left = (x + 7.5) + "px";
            editBox.style.top = (y + 7.5) + "px";        
            document.getElementById("drawing-area").appendChild(editBox);   

            // keep track of created boxes
            editBoxManager.boxes.push(editBox)
        })
    },
    
    // deletes all active resize boxes
    deleteBoxes: function() {         
        while (this.boxes.length) {
            const box = this.boxes.pop();
            box.parentElement.removeChild(box);            
        }
    },
    
    // moves selected box to new coordinates
    moveBoxes: function() {
        ["start", "end", "center"].forEach((position) => {
            // new position must be offset by container padding and box size
            const box = document.getElementById(position);
            const [x, y] = drawingManager[position];
            box.style.left = (x + 7.5) + "px";
            box.style.top = (y + 7.5) + "px";
        })
    }
}

// intializes some manager variables after the document is loaded
function setup(){
    // add the mouse event listerners to the drawing area    
    const drawingArea = document.getElementById("drawing-area");
    drawingArea.addEventListener("mousedown", eventManager.processEvent);
    drawingArea.addEventListener("mousemove", eventManager.processEvent);
    drawingArea.addEventListener("mouseup", eventManager.processEvent);
                            
    // provide the coordinates offset of the canvas to the coordinates manager
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    coordinatesManager.offsetX = rect.left;
    coordinatesManager.offsetY = rect.top; 
    
    // get the only render context that will be used throughout the app
    const ctx = canvas.getContext("2d");
    drawingManager.ctx = ctx
    undoRedoManager.ctx = ctx;
    undoRedoManager.size = [canvas.width, canvas.height];
}
setup();