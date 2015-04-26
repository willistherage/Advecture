"use strict";

(function()
{

    /**
     * \class Fluids2DApp
     *
     */
    var Fluids2DApp = function( canvasParentId ) {
        GNOCCHI.App.call( this, canvasParentId );     
    }

    Fluids2DApp.prototype = Object.create( 
        GNOCCHI.App.prototype, 

        {
            constructor : Fluids2DApp,

            setup : { value : function() {

                this.mousePrevPos = { x: -1, y: -1 };
                this.activeTouches = {};
                this.forces = [];   

                this.canvasParent.addEventListener( "mousedown", this.onMouseDown.bind( this ), false );
                this.canvasParent.addEventListener( "mousemove", this.onMouseMove.bind( this ), false );
                this.canvasParent.addEventListener( "touchstart", this.onTouchStart.bind( this ), false );
                this.canvasParent.addEventListener( "touchmove", this.onTouchMove.bind( this ), false );
                this.canvasParent.addEventListener( "touchend", this.onTouchEnd.bind( this ), false );

                this.cam = new GNOCCHI.CameraPersp({ 
                    pixelWidth      : this.getCanvasWidth(), 
                    pixelHeight     : this.getCanvasHeight(),
                    fovDegrees      : 15.0,
                    pixelAligned    : true,
                    upperLeftOrigin : true
                });
                
                var bounds = new GNOCCHI.Rect( 0, 0, 1, 1 );
                this.fluids = new Fluids2D( 108, 192, bounds );
                this.fluids.enableUv = true;
                this.fluids.wrapBoundary = true;

                /// Texture
                this.textureData = new Uint8Array( 3*this.fluids.resX*this.fluids.resY );
                this.texture = GNOCCHI.Texture2D.createFromArrayRGB( this.fluids.resX, this.fluids.resY, this.textureData );                

                /// Use the stock drawTexture shader.
                this.shader = this.renderer.defaultShaders.drawTexture;

                /// Create a rect mesh to draw with.
                this.rect = new GNOCCHI.Rect( 0, 0, this.getCanvasWidth(), this.getCanvasHeight() );
                this.rectMesh = GNOCCHI.TriMesh2D.createRect( this.rect );
                // Set and enable the shader will be used to draw these objects.
                this.rectMesh.acquireAttribLocations( this.shader );
                this.rectMesh.enableAttribs();

                // ===============================================================================================================
                var n = this.fluids.resX*this.fluids.resY;
                var initialIndices   = [];
                var initialPositions = new Array( 3*n );
                var initialUvs       = new Array( 2*n );

                // Poisitions/uv
                this.screenBounds = new GNOCCHI.Rect( 0, 0, this.getCanvasWidth(), this.getCanvasHeight() );
                var w  = this.screenBounds.getWidth();
                var h  = this.screenBounds.getHeight();
                var dx = w/(this.fluids.resX - 1);
                var dy = this.screenBounds.getHeight()/(this.fluids.resY - 1);
                console.log( "dx: " + dx + ", dy: " + dy );
                for( var j = 0; j < this.fluids.resY; ++j ) {
                    for( var i = 0; i < this.fluids.resX; ++i ) {
                        var idx  = j*this.fluids.resX + i;
                        var xidx = 3*idx + 0;
                        var yidx = 3*idx + 1;
                        var zidx = 3*idx + 2;

                        var x = this.screenBounds.x1 + i*dx;
                        var y = this.screenBounds.y1 + j*dy;
                        var z = 0.0;
                        
                        initialPositions[xidx] = x; 
                        initialPositions[yidx] = y; 
                        initialPositions[zidx] = z;
                        initialUvs[2*idx + 0] = i/(this.fluids.resX - 1);
                        initialUvs[2*idx + 1] = j/(this.fluids.resY - 1);
                    }
                }

                // Triangles
                for( var j = 0; j < (this.fluids.resY - 1); ++j ) {
                    for( var i = 0; i < (this.fluids.resX - 1); ++i ) {
                        var idx0 = (j + 0)*this.fluids.resX + (i + 0);
                        var idx1 = (j + 1)*this.fluids.resX + (i + 0);
                        var idx2 = (j + 1)*this.fluids.resX + (i + 1);
                        var idx3 = (j + 0)*this.fluids.resX + (i + 1);
                        //
                        initialIndices.push( idx0 );
                        initialIndices.push( idx1 );
                        initialIndices.push( idx2 );
                        //
                        initialIndices.push( idx0 );
                        initialIndices.push( idx2 );
                        initialIndices.push( idx3 );
                    }
                }
        
                //console.log( "Num triMesh indieces: " + initialIndices.length );

                this.triMesh = new GNOCCHI.TriMesh3D();
                this.triMesh.setIndices( initialIndices );
                this.triMesh.setPositions( initialPositions );
                this.triMesh.setUvs( initialUvs );
                this.triMesh.update();
                this.triMesh.acquireAttribLocations( this.shader );
                this.triMesh.enableAttribs();

                this.uv = this.triMesh.uvs.clientData;

                /// Texture
                this.imageTex = new GNOCCHI.Texture2D.create( "assets/img/stormtrooper.jpg" );

                // ===============================================================================================================
                

                /// Set some WebGL rendering parameters. 
                this.renderer.setClearColor( GNOCCHI.Color.create( 0, 0, 0 ) );
                this.renderer.setViewport( 0, 0, this.getCanvasWidth(), this.getCanvasHeight() );

                this.startTime = this.elapsedSeconds;
                this.endTime   = this.elapsedSeconds;
            }},

            onMouseDown : { value : function( event ) {
                var x = event.clientX;
                var y = event.clientY;

                this.mousePrevPos.x = x;
                this.mousePrevPos.y = y;
            }},

            onMouseMove : { value : function( event ) {
                var x = event.clientX;
                var y = event.clientY;
                var dx = x - this.mousePrevPos.x;
                var dy = y - this.mousePrevPos.y;

                var w = this.getCanvasWidth();
                var h = this.getCanvasHeight();
                var f = { x: x/w, y: y/h, dx: dx/w, dy: dy/h };
                this.forces.push( f );

                this.mousePrevPos.x = x;
                this.mousePrevPos.y = y;
            }},

            onTouchStart : { value : function( event ) {
                var touches = event.changedTouches;                
                for( var i = 0; i < touches.length; ++i ) {
                    var touch = touches[i];
                    var x = touch.clientX;
                    var y = touch.clientY;
                    //
                    this.activeTouches[touch.identifier] = { prevX: x, prevY: y };
                }

            }}, 

            onTouchMove : { value : function( event ) {
                var touches = event.changedTouches;                
                for( var i = 0; i < touches.length; ++i ) {
                    var touch = touches[i];
                    var x = touch.clientX;
                    var y = touch.clientY;                    
                    var prevX = this.activeTouches[touch.identifier].prevX;
                    var prevY = this.activeTouches[touch.identifier].prevY;
                    var dx = x - prevX;
                    var dy = y - prevY;
                    
                    var w = this.getCanvasWidth();
                    var h = this.getCanvasHeight();
                    var f = { x: x/w, y: y/h, dx: dx/w, dy: dy/h };
                    this.forces.push( f );

                    this.activeTouches[touch.identifier] = { prevX: x, prevY: y };
                }
            }},

            onTouchEnd : { value : function( event ) {
                var touches = event.changedTouches;                
                for( var i = 0; i < touches.length; ++i ) {
                    var touch = touches[i];
                    delete this.activeTouches[touch.identifier];
                }
            }}, 

            update : { value : function() {
                if( this.forces.length > 0 ) {
                    this.fluids.splatVelocity( this.forces );
                    this.fluids.splatDensity( this.forces );
                    this.forces = [];
                } 
            
                this.fluids.update();

                for( var j = 0; j < this.fluids.resY; ++j ) {
                    for( var i = 0; i < this.fluids.resX; ++i ) {
                        var idx = j*this.fluids.resX + i;

/*
                        this.textureData[3*idx + 0] = this.fluids.vel1[2*idx + 0];
                        this.textureData[3*idx + 1] = this.fluids.vel1[2*idx + 1];
                        this.textureData[3*idx + 2] = 0;
/*/
                        //var v = Math.min( 255, 255*this.fluids.den1[idx] );
                        //this.textureData[3*idx + 0] = v;
                        //this.textureData[3*idx + 1] = v*0.65;
                        //this.textureData[3*idx + 2] = 0;

                        //var u = Math.min( 255, 255*this.fluids.u1[idx] );
                        //var v = Math.min( 255, 255*this.fluids.v1[idx] );
                        //this.textureData[3*idx + 0] = u;
                        //this.textureData[3*idx + 1] = v;
                        //this.textureData[3*idx + 2] = 0;

                        var u = this.fluids.u1[idx];
                        var v = this.fluids.v1[idx];
                        this.uv[2*idx + 0] = u;
                        this.uv[2*idx + 1] = v;

//*/                      
                    }
                }
                //
                //this.texture.texImage2DFromArrayRGB( this.fluids.resX, this.fluids.resY, this.textureData );

                this.triMesh.uvs.dirty = true;
                this.triMesh.update();
            }},

            draw : { value : function() {
                /// Clear the canvas.
                this.renderer.clear();

                /// Draw a image texture.
                this.shader.bind();
                this.shader.uniform( "mvp", this.cam.mvp() );
                this.shader.uniform( "tex", this.imageTex );
                this.triMesh.draw();
                this.shader.unbind();

/*
                /// Draw a image texture.
                this.shader.bind();
                this.shader.uniform( "mvp", this.cam.mvp() );
                this.shader.uniform( "tex", this.texture );
                this.rectMesh.draw();
                this.shader.unbind();
*/

/*
                if( this.elapsedFrames > 0 && 0 == (this.elapsedFrames % 240) ) {
                    this.endTime = this.elapsedSeconds;

                    var fps = 239/(this.endTime - this.startTime);
                    console.log( "fps=" + fps );
                    
                    this.startTime = this.elapsedSeconds;
                }
*/
            }}
        }
    );

    var app = new Fluids2DApp( "pane1" );
    app.run();
}
)();

