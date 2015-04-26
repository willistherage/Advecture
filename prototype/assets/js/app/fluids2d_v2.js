"use strict";

/**
 * \class Fluids2D
 *
 */
var Fluids2D = function( nx, ny, bounds ) {
    this.resX = nx;
    this.resY = ny;
    this.bounds = bounds;
   
    this.cellSizeX = this.bounds.getWidth()/this.resX;
    this.cellSizeY = this.bounds.getHeight()/this.resY;
    this.halfDivCellSizeX = 0.5/this.cellSizeX;
    this.halfDivCellSizeY = 0.5/this.cellSizeY;

    var nsize = this.resX*this.resY;
    this.xvel0 = new Float32Array( nsize );
    this.yvel0 = new Float32Array( nsize );
    this.xvel1 = new Float32Array( nsize );
    this.yvel1 = new Float32Array( nsize );
    this.div  = new Float32Array( nsize );
    this.prs  = new Float32Array( nsize );
    this.curl = new Float32Array( nsize );
    this.curlLength = new Float32Array( nsize );

    this.enableDensity = true;
    this.den0 = new Float32Array( nsize );
    this.den1 = new Float32Array( nsize );

    this.enableUv = false;
    this.u0 = new Float32Array( nsize );
    this.v0 = new Float32Array( nsize );
    this.u1 = new Float32Array( nsize );
    this.v1 = new Float32Array( nsize );

    this.wrapBoundary = false;

    this.dt = 0.1;

    this.velDiss = 0.999999999;
    this.denDiss = 0.99000;
    this.uvDiss  = 0.99999;

    this.velVisc = 0.1;
    this.denVisc = 0.1;
    this.uvVisc  = 0.1;

    this.vorticityScale = 0.25;

    var iStart = 1;
    var iEnd   = iStart + this.resX;
    var jStart = 1;
    var jEnd   = jStart + this.resY;
    //
    var velX = 0.0;
    var velY = -50.0;
    var maxDist = 0.15*(Math.min( this.resX, this.resY ));
    var maxDistSq = maxDist*maxDist;
    //
    console.log( maxDist );
    //
    for ( var i = 0; i < this.xvel0.length; ++i ) {
        this.xvel0[i] = 0.0;
        this.yvel0[i] = 0.0;
        this.xvel1[i] = 0.0;
        this.yvel1[i] = 0.0;
    }
    //
    for( var i = 0; i < this.den0.length; ++i ) {
        this.den0[i] = 0.0;
        this.den1[i] = 0.0;
    }
    //  
    var dx = 1.0/(this.resX - 1);
    var dy = 1.0/(this.resY - 1);
    for( var j = 0; j < this.resY; ++j ) {
        for( var i = 0; i < this.resX; ++i ) {
            var u = i*dx;
            var v = j*dy;
            var idx = j*this.resX + i;
            this.u0[idx] = u;
            this.v0[idx] = v;
            this.u1[idx] = u;
            this.v1[idx] = v;
        }
    }
    //
    var centerX = 0.5*this.resX;
    var centerY = 0.5*this.resY;
    //
    for( var j = 0; j < this.resY; ++j ) {
        for( var i = 0; i < this.resX; ++i ) {
            var dx = i - centerX;
            var dy = j - centerY;
            var distSq = dx*dx + dy*dy;
            if( distSq < maxDistSq ) {
                var falloff = 1.0 - (distSq/maxDistSq);
                falloff = falloff*falloff;
                //
                var x = i;
                var y = j + Math.floor(maxDist);
                var idx = y*this.resX + x; 
                //this.vel0[2*idx + 0] = velX;
                //this.vel0[2*idx + 1] = velY;
                this.xvel0[idx] = velX;
                this.yvel0[idx] = velY;
                //
                this.den0[idx] = 5.0;
                //console.log( i + " : " + j );
            }
        }
    }
}

Fluids2D.prototype = {
    constructor : Fluids2D,

    /**
     * forces - array of { x, y, dx, dy } - all should be normalized [0, 1).
     *
     */
    splatVelocity : function( forces ) {
        for( var i = 0; i < forces.length; ++i ) {
            var f = forces[i];

            var w = this.resX - 1;
            var h = this.resY - 1;

            var x = f.x*w;
            var y = f.y*h;
            var dx = f.dx*w;
            var dy = f.dy*h;
            x = Math.max( 0.0, Math.min( w, x ) );
            y = Math.max( 0.0, Math.min( h, y ) );
            
            //var x0 = Math.floor( x );
            //var y0 = Math.floor( y );
            //var x0 = ~~x;
            //var y0 = ~~y;
            var x0 = x|0;
            var y0 = y|0;
            var x1 = x0 + 1;
            var y1 = y0 + 1;

            var a1 = x - x0;
            var b1 = y - y0;
            var a0 = 1.0 - a1;
            var b0 = 1.0 - b1;

            var points = [
                { x: x0, y: y0, s: a0*b0 },
                { x: x1, y: y0, s: a1*b0 },
                { x: x0, y: y1, s: a0*b1 },
                { x: x1, y: y1, s: a1*b1 },
            ];

            var scale = 250.0;
            for( var k = 0; k < points.length; ++k ) {
                var p = points[k];
                //var idx = 2*(p.y*this.resX + p.x);
                var idx = p.y*this.resX + p.x;
                var valx = p.s*dx*scale;
                var valy = p.s*dy*scale;
                //this.vel0[idx + 0] += valx;
                //this.vel0[idx + 1] += valy;
                this.xvel0[idx] += valx;
                this.yvel0[idx] += valy;
            }
        } 
    },

    /**
     * forces - array of { x, y, dx, dy } - all should be normalized [0, 1).
     *
     */
    splatDensity : function( forces ) {
        for( var i = 0; i < forces.length; ++i ) {
            var f = forces[i];

            var w = this.resX - 1;
            var h = this.resY - 1;

            var x = f.x*w;
            var y = f.y*h;
            var dx = f.dx*w;
            var dy = f.dy*h;
            x = Math.max( 0.0, Math.min( w, x ) );
            y = Math.max( 0.0, Math.min( h, y ) );
            
            //var x0 = Math.floor( x );
            //var y0 = Math.floor( y );
            //var x0 = ~~x;
            //var y0 = ~~y;
            var x0 = x|0;
            var y0 = y|0;
            var x1 = x0 + 1;
            var y1 = y0 + 1;

            var a1 = x - x0;
            var b1 = y - y0;
            var a0 = 1.0 - a1;
            var b0 = 1.0 - b1;

            var points = [
                { x: x0, y: y0, s: a0*b0 },
                { x: x1, y: y0, s: a1*b0 },
                { x: x0, y: y1, s: a0*b1 },
                { x: x1, y: y1, s: a1*b1 },
            ];

            var scale =10.0;
            for( var k = 0; k < points.length; ++k ) {
                var p = points[k];
                var idx = p.y*this.resX + p.x;
                var val = p.s*scale;
                this.den0[idx] += val;
            }
        } 
    },

    setZeroBoundary : function( field ) {
        var resX = this.resX;
        var resY = this.resY;

        var m = resX - 1;
        for( var j = 0; j < resY; ++j ) {
            var idx0 = j*resX + 0;
            var idx1 = j*resX + m;
            field[idx0] = 0.0;
            field[idx1] = 0.0;
        }

        var n = resY - 1;
        for( var i = 0; i < resX; ++i ) {
            var idx0 = 0*resX + i;
            var idx1 = n*resX + i;
            field[idx0] = 0.0;
            field[idx1] = 0.0;
        }
    },

    setWrapBoundary : function( field ) {
        var resX = this.resX;
        var resY = this.resY;

        var m = resX - 1;
        var x0 = 1;
        var x1 = m - 1;
        for( var j = 0; j < resY; ++j ) {
            var idx0 = j*resX + 0;
            var idx1 = j*resX + m;
            var wdx0 = j*resX + x1;
            var wdx1 = j*resX + x0;
            field[idx0] = field[wdx0];
            field[idx1] = field[wdx1];
        }

        var n = resY - 1;
        var y0 = 1;
        var y1 = n - 1;
        for( var i = 0; i < resX; ++i ) {
            var idx0 = 0*resX + i;
            var idx1 = n*resX + i;
            var wdx0 = y1*resX + i;
            var wdx1 = y0*resX + i; 
            field[idx0] = field[wdx0];
            field[idx1] = field[wdx1];
        }

        field[0*resX + 0] = field[y1*resX + x1];
        field[0*resX + m] = field[y1*resX + x0];
        field[n*resX + 0] = field[y0*resX + x1];
        field[n*resX + m] = field[y0*resX + x0];
    },

    setBoundary : function( field ) {
        if( this.wrapBoundary ) {
            this.setWrapBoundary( field );
        }
        else {
            this.setZeroBoundary( field );
        }
    },

    advectAndDiffuse : function( diss, visc, dt, xvel, yvel, src, dst ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var xMin = 0.5;
        var xMax = this.resX - 1.5;
        var yMin = 0.5;
        var yMax = this.resY - 1.5;

        var alpha   = this.cellSizeX*this.cellSizeY/(visc*dt);
        var beta    = 4.0 + alpha;
        var invBeta = 1.0/beta;

        var resX = this.resX;
        var resY = this.resY;
      
        for( var j = jStart; j < jEnd; ++j ) {
            for( var i = iStart; i < iEnd; ++i ) {
                var idx = j*resX + i;

                var velx = xvel[idx];
                var vely = yvel[idx]; 
                var dx = dt*velx;
                var dy = dt*vely;
                var iPrev = i - dx;
                var jPrev = j - dy;
                iPrev = Math.max( xMin, Math.min( xMax, iPrev ) );
                jPrev = Math.max( yMin, Math.min( yMax, jPrev ) );

                // Calculate bilinear values
                //var x0 = Math.floor( iPrev );
                //var y0 = Math.floor( jPrev );
                //var x0 = ~~iPrev;
                //var y0 = ~~jPrev;
                var x0 = iPrev|0;
                var y0 = jPrev|0;
                var x1 = x0 + 1;
                var y1 = y0 + 1;
                var a1 = iPrev - x0;
                var b1 = jPrev - y0;
                var a0 = 1.0 - a1;
                var b0 = 1.0 - b1;
                                   
                var advIdx00 = y0*resX + x0;
                var advIdx10 = y0*resX + x1;
                var advIdx01 = y1*resX + x0;
                var advIdx11 = y1*resX + x1;
                //
                var v00 = src[advIdx00];
                var v10 = src[advIdx10];
                var v01 = src[advIdx01];
                var v11 = src[advIdx11];
                var advected = (b0*(a0*v00 + a1*v10) +  
                                b1*(a0*v01 + a1*v11));

                var difIdxL = (j + 0)*resX + (i - 1); 
                var difIdxR = (j + 0)*resX + (i + 1); 
                var difIdxB = (j - 1)*resX + (i + 0); 
                var difIdxT = (j + 1)*resX + (i + 0); 
                var difIdxC = (j*resX + i);
                //
                var xL = src[difIdxL];
                var xR = src[difIdxR];
                var xB = src[difIdxB];
                var xT = src[difIdxT];
                var bC = src[difIdxC];
                var diffused = (xL + xR + xB + xT + alpha*bC)*invBeta;

                var val = diss*(0.75*advected + 0.25*diffused);
                dst[idx] = val;
            }
        }
    },

    computeDivergence : function( xvel, yvel, outDiv ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var resX = this.resX;
        var resY = this.resY;

        for( var i = 0; i < outDiv.length; ++i ) {
            outDiv[i] = 0.0;
        }

        var logData = [];

        for( var j = jStart; j < jEnd; ++j ) {
            for( var i = iStart; i < iEnd; ++i ) {
                var idx = j*resX + i;
                
                var idxL = (j + 0)*resX + (i - 1);
                var idxR = (j + 0)*resX + (i + 1);
                var idxB = (j - 1)*resX + (i + 0); 
                var idxT = (j + 1)*resX + (i + 0);

                var diffX = xvel[idxR] - xvel[idxL];
                var diffY = yvel[idxT] - yvel[idxB];
                
                var val = this.halfDivCellSizeX*diffX + this.halfDivCellSizeY*diffY;
                outDiv[idx] = val;
            }
        }
    },


    jacobi : function( alpha, beta, xMat, bMat, outMat, niters ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var resX = this.resX;
        var resY = this.resY;

        var invBeta = 1.0/beta;
        for( var iter = 0; iter < niters; ++iter ) {
            var logData = [];
            for( var j = jStart; j < jEnd; ++j ) {
                for( var i = iStart; i < iEnd; ++i ) {
                    var idx = j*resX + i;
                    
                    var idxL = ((j + 0)*resX + (i - 1));
                    var idxR = ((j + 0)*resX + (i + 1));
                    var idxB = ((j - 1)*resX + (i + 0)); 
                    var idxT = ((j + 1)*resX + (i + 0));
                    var idxC = (j*resX + i);

                    var xL = xMat[idxL];
                    var xR = xMat[idxR];
                    var xB = xMat[idxB];
                    var xT = xMat[idxT];
                    var bC = bMat[idxC];

                    var val = (xL + xR + xB + xT + alpha*bC)*invBeta;
                    outMat[idx] = val;
                }
            }
        }
    },

    solvePressure : function( niters, div, inOutPressure ) {
        var alpha = -this.cellSizeX*this.cellSizeY;
        var beta  = 4.0;

        for( var i = 0; i < inOutPressure.length; ++i ) {
            inOutPressure[i] = 0.0;
        }
   
        this.jacobi( alpha, beta, inOutPressure, div, inOutPressure, niters ); 
    }, 

    subtractGradient : function( prs, xvel, yvel ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var resX = this.resX;
        var resY = this.resY;

        var logData = [];

        for( var j = jStart; j < jEnd; ++j ) {
            for( var i = iStart; i < iEnd; ++i ) {
                var idx = j*resX + i;
                                   
                var idxL = ((j + 0)*resX + (i - 1)); 
                var idxR = ((j + 0)*resX + (i + 1)); 
                var idxB = ((j - 1)*resX + (i + 0)); 
                var idxT = ((j + 1)*resX + (i + 0)); 
                
                var diffX = prs[idxR] - prs[idxL];
                var diffY = prs[idxT] - prs[idxB];

                var valX = this.halfDivCellSizeX*diffX;
                var valY = this.halfDivCellSizeY*diffY;

                xvel[idx] -= valX;
                yvel[idx] -= valY;
            }
        }
    },

    calculateCurl : function( xvel, yvel, outCurl, outCurlLength ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var resX = this.resX;
        var resY = this.resY;

        for( var j = jStart; j < jEnd; ++j ) {
            for( var i = iStart; i < iEnd; ++i ) {
                var idxL = (j + 0)*resX + (i - 1);
                var idxR = (j + 0)*resX + (i + 1);
                var idxB = (j - 1)*resX + (i + 0); 
                var idxT = (j + 1)*resX + (i + 0);

                var dudy = xvel[idxT] - xvel[idxB];
                var dvdx = yvel[idxR] - yvel[idxL];
                var curl = (dudy - dvdx)*0.5;

                var idx = j*resX + i;
                outCurlLength[idx] = curl;
                outCurl[idx] = Math.abs( curl );
            }
        }
    },

    vorticityConfinement : function( vorticityScale, xvel, yvel, curl, curlLength, outXVel, outYVel ) {
        var iStart = 1;
        var iEnd   = this.resX - 1;
        var jStart = 1;
        var jEnd   = this.resY - 1;

        var resX = this.resX;
        var resY = this.resY;

        for( var j = jStart; j < jEnd; ++j ) {
            for( var i = iStart; i < iEnd; ++i ) {
                var idxL = (j + 0)*resX + (i - 1);
                var idxR = (j + 0)*resX + (i + 1);
                var idxB = (j - 1)*resX + (i + 0); 
                var idxT = (j + 1)*resX + (i + 0);

                var dwdx = (curl[idxR] - curl[idxL])*0.5;
                var dwdy = (curl[idxT] - curl[idxB])*0.5;

                var lenSq = dwdx*dwdx + dwdy*dwdy;
                var len = Math.sqrt( lenSq ) + 0.000001;
                var s = 1.0/len;
                dwdx *= s;
                dwdy *= s;

                var idx = j*resX + i;
                var v = curlLength[idx];
                outXVel[idx] = xvel[idx] + vorticityScale*dwdy*-v;
                outYVel[idx] = yvel[idx] + vorticityScale*dwdx*v;
            }
        }
    },



    update : function() {
        this.advectAndDiffuse( this.velDiss, this.velVisc, this.dt, this.xvel0, this.yvel0, this.xvel0, this.xvel1 );
        this.advectAndDiffuse( this.velDiss, this.velVisc, this.dt, this.xvel0, this.yvel0, this.yvel0, this.yvel1 );
        this.setBoundary( this.xvel1 );
        this.setBoundary( this.yvel1 );

        this.computeDivergence( this.xvel1, this.yvel1, this.div );
        this.setBoundary( this.div );

        this.solvePressure( 32, this.div, this.prs );
        this.setBoundary( this.prs );

        this.subtractGradient( this.prs, this.xvel1, this.yvel1 );

        this.calculateCurl( this.xvel1, this.yvel1, this.curl, this.curlLength );
        this.setBoundary( this.curl );
        this.setBoundary( this.curlLength );
        //
        var tmp = this.xvel0;
        this.xvel0 = this.xvel1;
        this.xvel1 = tmp;
        var tmp = this.yvel0;
        this.yvel0 = this.yvel1;
        this.yvel1 = tmp;

        //
        this.vorticityConfinement( this.vorticityScale, this.xvel0, this.yvel0, this.curl, this.curlLength, this.xvel1, this.yvel1 );    
        this.setBoundary( this.xvel1 );
        this.setBoundary( this.yvel1 );

        if( this.enableDensity ) {
            this.advectAndDiffuse( this.denDiss, this.denVisc, this.dt, this.xvel0, this.yvel0, this.den0, this.den1 );
            this.setBoundary( this.den1 );
        }

        if( this.enableUv ) {
            this.advectAndDiffuse( this.uvDiss, this.uvVisc, this.dt, this.xvel0, this.yvel0, this.u0, this.u1 );
            this.advectAndDiffuse( this.uvDiss, this.uvVisc, this.dt, this.xvel0, this.yvel0, this.v0, this.v1 );
            this.setBoundary( this.u1 );
            this.setBoundary( this.v1 );
        }

        var tmp = this.xvel0;
        this.xvel0 = this.xvel1;
        this.xvel1 = tmp;
        var tmp = this.yvel0;
        this.yvel0 = this.yvel1;
        this.yvel1 = tmp;

        if( this.enableDensity ) {
            var tmp = this.den0;
            this.den0 = this.den1;
            this.den1 = tmp;
        }

        if( this.enableUv ) {
            var tmp = this.u0;
            this.u0 = this.u1;
            this.u1 = tmp;

            var tmp = this.v0;
            this.v0 = this.v1;
            this.v1 = tmp;
        }
    },

    draw : function() {
    }
};

