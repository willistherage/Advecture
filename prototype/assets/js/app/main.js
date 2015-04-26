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
                this.enableUv = true;
                //this.fluids.wrapBoundary = true;

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
                        var v = Math.min( 255, 255*this.fluids.den1[idx] );
                        this.textureData[3*idx + 0] = v;
                        this.textureData[3*idx + 1] = v*0.65;
                        this.textureData[3*idx + 2] = 0;
//*/

                    }
                }
                //
                this.texture.texImage2DFromArrayRGB( this.fluids.resX, this.fluids.resY, this.textureData );
            }},

            draw : { value : function() {
                /// Clear the canvas.
                this.renderer.clear();

                /// Draw a image texture.
                this.shader.bind();
                this.shader.uniform( "mvp", this.cam.mvp() );
                this.shader.uniform( "tex", this.texture );
                this.rectMesh.draw();
                this.shader.unbind();

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

