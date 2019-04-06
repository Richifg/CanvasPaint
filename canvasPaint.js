
// processes all mouse event happening inside the drawing arrea
// keeps track of selected tool and current state
const eventManager = {
    // pen tool is selected by default
    tool: "pen",
    
    // resizing of shapes require to keep track of states between events
    resize: false,
    
    // checks currently selected tool and redirects the event to the appropiate function
    processEvent: function(event) {
        // check current tool
        const newTool = document.querySelector("input[type=radio]:checked").value;
        
        // tool changes require some cleanup
        if (newTool !== eventManager.tool) {
            eventManager.tool = newTool;
            resizeBoxManager.deleteBoxes();
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
                this.resize = source.id === "start" ? "start" : source.id === "end" ? "end" : "";  
                
                if (this.resize) {
                    // redraw current shape
                    drawingManager.drawShape(this.tool, x, y, this.resize);
                } else {
                    // cleanup and start new shape
                    resizeBoxManager.deleteBoxes();
                    undoRedoManager.addUndo();
                    drawingManager.drawShape(this.tool, x, y, "end", true);  
                }                
                break;
            case "mousemove":                
                if (event.buttons !== 0) {
                    undoRedoManager.undo(true);
                    if (this.resize) {
                        // make resize boxes follow cursor and redraw shape
                        resizeBoxManager.moveBox(x, y, this.resize);
                        drawingManager.drawShape(this.tool, x, y, this.resize);
                    } else {
                        // redraw current shape
                        drawingManager.drawShape(this.tool, x, y);
                    }
                }
                break;
            case "mouseup":
                // if not resizing create resize boxes
                if (!this.resize) {                    
                    // make sure click event happened on different coordinates before creaing boxes
                    if (drawingManager.start.toString() !== drawingManager.end.toString()) {
                        resizeBoxManager.createBoxes("start");
                        resizeBoxManager.createBoxes("end");
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
    
    // start and end coordinates of the current drawing
    // used on "shapes" like line and square
    start: [0, 0],
    end: [0, 0], 
    
    drawPen: function(x, y, begin = false){
        if (begin) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);            
        }
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    },    
    drawShape: function(tool, x, y, position = "end", isBeginning = false) {
        switch (tool) { 
            case "line": this.drawLine(x, y, position, isBeginning); break;
            case "square": this.drawSquare(x, y, position, isBeginning); break;
            case "circle": this.drawCircle(x, y, position, isBeginning); break;
        }
    },    
    drawLine: function(x, y, position, isBeginning) {
        if (isBeginning) {
            this.start = [x, y];            
        }        
        this[position] = [x, y];
        this.ctx.beginPath();
        this.ctx.moveTo(this.start[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.end[1]);
        this.ctx.stroke();
    },
    drawSquare: function(x, y, position, isBeginning) {
        if (isBeginning) {
            this.start = [x, y];            
        }        
        this[position] = [x, y];
        this.ctx.beginPath();
        this.ctx.moveTo(this.start[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.start[1]);
        this.ctx.lineTo(this.end[0], this.end[1]);
        this.ctx.lineTo(this.start[0], this.end[1]);
        this.ctx.lineTo(this.start[0], this.start[1]);
        this.ctx.stroke();
    },
    drawCircle: function(x, y, position, isBeginning) {
        console.log("DRAWING CIRCLE!!!");
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
        document.getElementById("coordinates").textContent = this.x + " x " + this.y + " px";    
        
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
        document.getElementById("undo").removeAttribute("disabled");
        this.redoStack = [];   
        document.getElementById("redo").setAttribute("disabled","");
    },
    
    // functions that perform the undo redo logic
    undo: function(softUndo = false){
        // soft undo is constantly called by the shape functions when being redrawn
        if (softUndo) {
            this.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);    
            return;
        }
        
        // clean resize boxes if existent
        resizeBoxManager.deleteBoxes();
        
        // add about to be undoed image to redo stack and enable button
        const currentImage = this.ctx.getImageData(0, 0, this.size[0], this.size[1]);
        this.redoStack.push(currentImage);                
        document.getElementById("redo").removeAttribute("disabled");
        
        // pop element from stack and restore canvas
        const lastImage = this.undoStack.pop();        
        this.ctx.putImageData(lastImage, 0, 0);
        
        // disable undo button if needed
        if (!this.undoStack.length) { 
            document.getElementById("undo").setAttribute("disabled","");
        }                
    },    
    redo: function(){
        // add about to be redoed image to undo stack and enable button
        const currentImage = this.ctx.getImageData(0, 0, this.size[0], this.size[1]);
        this.undoStack.push(currentImage);                
        document.getElementById("undo").removeAttribute("disabled");
        
        // pop element from stack and restore canvas
        const lastImage = this.redoStack.pop();        
        this.ctx.putImageData(lastImage, 0, 0);
        
        // disable redo button if needed
        if (!this.redoStack.length) { 
            document.getElementById("redo").setAttribute("disabled","");
        }
    },
};

// stores and mantinas the resize boxes that are create fo shapes
const resizeBoxManager = {
    boxes: [],
    
    // creates a resize box at the given position
    createBoxes: function(position = "start") {                 
        // create and style the box
        const resizeBox = document.createElement("div");        
        resizeBox.id = position;
        resizeBox.className = "resize-box"        
        
        // locate it at the desired point (7.5 = main padding - half box size)
        const [x, y] = drawingManager[position];                
        resizeBox.style.left = (x + 7.5) + "px";
        resizeBox.style.top = (y + 7.5) + "px";        
        document.getElementById("drawing-area").appendChild(resizeBox);   
        
        // keep track of created boxes
        this.boxes.push(resizeBox)
    },
    
    // deletes all active resize boxes
    deleteBoxes: function() {         
        while (this.boxes.length) {
            const box = this.boxes.pop();
            box.parentElement.removeChild(box);            
        }
    },
    
    // moves selected box to new coordinates
    moveBox: function(x, y, position) {
        const box = document.getElementById(position);
        
        // new position must be offset by container padding and box size
        box.style.left = (x + 7.5) + "px";
        box.style.top = (y + 7.5) + "px";
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