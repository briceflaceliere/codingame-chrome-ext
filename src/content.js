

var layouts = ['grid', 'random', 'preset', 'circle', 'concentric', 'breadthfirst', 'cose'];
var myLayout = localStorage.getItem('myLayout');
myLayout = myLayout ? myLayout : 'grid';

function bindOnDone(callback) {

    let send = window.XMLHttpRequest.prototype.send;

    function sendReplacement() {
        if(this.onreadystatechange) {
            this._onreadystatechange = this.onreadystatechange;
        }

        this.onreadystatechange = function(){
            if (this.readyState == 4) {
                callback(this);
            }

            if(this._onreadystatechange) {
                return this._onreadystatechange.apply(this, arguments);
            }
        };

        return send.apply(this, arguments);
    }

    window.XMLHttpRequest.prototype.send = sendReplacement;
}


function onDone(xhr) {
    if (xhr.status < 200 || xhr.status >= 300) {
        return;
    }

    let url = new URL(xhr.responseURL);
    switch (url.pathname) {
        case '/services/TestSession/play':
            onPlay(xhr);
            break;
    }
}

var cy = null;
let frame = null;
let compiledGraph;

function onPlay(xhr) {
    console.log ('play');
    frame = compiledGraph = null;
    var hasGraph = false;
    let response = JSON.parse(xhr.responseText);
    let extData = response.frames.filter(function(el){
        return !el.keyframe;
    }).map(function(el){
        return el.stderr.split("\n").map(function(line){
            return line.split('|');
        }).filter(function(line){
            if (line[0] == 'CgExt') {
                hasGraph = true;
                return true;
            }
            return false;
        });
    });
    if (!hasGraph) {
        if (cy) {
            cy.destroy();
            $('#graph-viewer').remove();
            $('.bt-switch-graph').remove();
        }
        return;
    }

    compiledGraph = compileGraph(extData);

    let codeContent = $('.ide-content .code-content');
    let viewer = $('#graph-viewer');
    if (viewer.length == 0) {
        codeContent.after('<div id="graph-viewer" style="display:none;"><div id="graph-container"></div></div>');
        viewer = $('#graph-viewer');
        $('.code-header .code-buttons').prepend('<div class="bt-switch-graph"><button onClick="switchGraphCode();">Show code</button></div>');
        var sel = document.createElement("select");
        sel.onchange = changeGrid;
        for (layout of layouts) {
            opt = document.createElement("option");
            opt.value = layout;
            opt.text = "Graph: " + layout;
            sel.add(opt, null);
        }
        sel.value = myLayout;
        $('.code-header .code-management').append(sel);
    } 
    
    let isOpen = viewer.is(":visible");
   
    if (!isOpen) {
        codeContent.hide()
        viewer.show();
        $('.bt-switch-graph button').text('Show code');
    }

    if (cy === null) {
        cy = cytoscape({
            container: document.getElementById('graph-container'),
            style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                'background-color': 'white',
                'label': 'data(id)',
                'color': 'white',
                }
            },
        
            {
                selector: 'edge',
                style: {
                'width': 1,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle'
                }
            }
            ],
        });
    } else {
        cy.removeData();
    }
    
    showFrame(0);
}

function changeGrid()
{
    myLayout = this.value;
    localStorage.setItem('myLayout', myLayout);
    refreshLayout();
}


function showFrame(number) {
    if (frame === number) {
        return;
    }
    if (frame >= number) {
        cy.remove("[frame > " + number + "]");

        cy.elements().removeStyle();
        for (i = 0; i <= number; i++) {
            if (compiledGraph[i] && compiledGraph[i].elements) {
                for(el of compiledGraph[i].elements) {
                    if (el.style) {
                        cy.elements('[id = "' + el.data.id + '"]').style(el.style);
                    }
                    
                }
            }
            if (compiledGraph[i] && compiledGraph[i].styles) {
                for(style of compiledGraph[i].styles) {
                    cy.elements(style[0]).style(style[1]);
                }
            }
        }

    } else {
        frame = frame === null ? -1 : frame;

        if (compiledGraph[number] && compiledGraph[number].clean) {
            cy.elements().remove();
            frame = number - 1;
        }

        for (i = frame + 1; i <= number; i++) {
            
            if (compiledGraph[i] && compiledGraph[i].clean) {
                cy.elements().remove();
            }
            if (compiledGraph[i] && compiledGraph[i].elements) {
                cy.add(compiledGraph[i].elements);
            }
            if (compiledGraph[i] && compiledGraph[i].styles) {
                for(style of compiledGraph[i].styles) {
                    cy.elements(style[0]).style(style[1]);
                }
            }
        }
        
    }
    
    refreshLayout();
    frame = number;
}

function refreshLayout()
{
    if (!cy) {
        return;
    }
    var layout = cy.elements().layout({
        name: myLayout,
        nodeDimensionsIncludeLabels: true
    });
    layout.run();
}

function switchGraphCode()
{
    let viewer = $('#graph-viewer');
    let isOpen = viewer.is(":visible");
    let bt = $('.bt-switch-graph button');
    let codeContent = $('.ide-content .code-content');

    if (isOpen) {
        viewer.hide();
        codeContent.show();
        bt.text('Show graph');
    } else {
        codeContent.hide();
        viewer.show();
        bt.text('Show code');
    }
}

function compileGraph(data) 
{
    let frames = [];
    let i = 1;
    let el;
    frames.push({ elements: [], styles: [], clean: false })
    for (let frame of data) {
        let data = { elements: [], styles: [], clean: false };
        for (let item of frame) {
            switch (item[1]) {
                case 'N':
                    el = {data: {id: item[2], frame: i}};
                    if (item[3]) {
                        el.style = {'background-color': item[3]}
                    }
                    data.elements.push(el);
                    break;
                case 'NC':
                    data.styles.push(['[id = "' + item[2] + '"]', {'background-color': item[3]}]);
                    break;    
                case 'E':
                    el = {data: {id: item[2]+'.'+item[3], source: item[2], target: item[3], frame: i}};
                    if (item[4]) {
                        el.style = {'line-color': item[4]}
                    }
                    data.elements.push(el);
                    break;
                case 'EC':
                    data.styles.push(['[id = "' + item[2]+'.'+item[3] + '"]', {'line-color': item[4]}]);
                    break;
                case 'C':
                    data.clean = true
                    break;          
            }
            
        }
        frames.push(data);
        i++;
    }
    return frames;
}


bindOnDone(onDone);

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event)
{
    if (compiledGraph && event.data.type == 'progress') {
        showFrame(event.data.frame);
    }
}