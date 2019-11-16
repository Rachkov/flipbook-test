import React from 'react';
import PropTypes from 'prop-types';
import ActionBar from './ActionBar';
import Matrix from './matrix';
import './Flipbook.css';

let IE, easeIn, easeInOut, easeOut;

easeIn = function(x) {
    return Math.pow(x, 2);
};

easeOut = function(x) {
    return 1 - easeIn(1 - x);
};

easeInOut = function(x) {
    if (x < 0.5) {
        return easeIn(x * 2) / 2;
    } else {
        return 0.5 + easeOut((x - 0.5) * 2) / 2;
    }
};

IE = /Trident/.test(navigator.userAgent);

class Flipbook extends React.Component {

    constructor(props) {
        super(props);
        //this.canFlipLeft(resize.currentPage, resize.displayedPages, resize.currentPage)
        this.viewport = React.createRef();
        //const resize = this.onResize();
        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            imageWidth: null,
            imageHeight: null,
            displayedPages: 1,
            nImageLoad: 0,
            nImageLoadTrigger: 0,
            imageLoadCallback: null,
            currentPage: 0,
            firstPage: 0,
            secondPage: 1,
            zoomIndex: 0,
            zoom: 1,
            zooming: false,
            touchStartX: null,
            touchStartY: null,
            maxMove: 0,
            activeCursor: null,
            hasTouchEvents: false,
            hasPointerEvents: false,
            minX: 2e308,
            maxX: -2e308,
            polygonArray: [],
            preloadedImages: {},
            flip: {
                progress: 0,
                direction: null,
                frontImage: null,
                backImage: null,
                auto: false,
                opacity: 1
            },
            animatingCenter: false,
            startScrollLeft: 0,
            startScrollTop: 0,
            scrollLeft: 0,
            scrollTop: 0,
            canFlipLeft: null,
            canFlipRight: null,
        };
    }

    static defaultProps = {
        pagesHiRes: (() => {
            return [];
        }),
        forwardDirection: 'right',
        flipDuration: 1000,
        singlePage: false,
        nPolygons: 10,
        perspective: 2400,
        ambient: 0.4,
        gloss: 0.6,
        swipeMin: 1,
        zoomDuration: 500,
        zooms: [1, 2, 4]
    };

    canFlipLeft() {
        const { currentPage, displayedPages } = this.state;
        if (this.props.forwardDirection === 'left') {
            return currentPage < this.props.pages.length - displayedPages
        } else {
            //return !flip.direction && currentPage >= displayedPages && !(displayedPages === 1 && !this.pageUrl(firstPage - 1))
            return currentPage > 0
        }
    };
    canFlipRight() {
        const { currentPage, displayedPages } = this.state;
        if (this.props.forwardDirection === 'right') {
            //return !flip.direction && currentPage < this.props.pages.length - displayedPages;
            return currentPage < this.props.pages.length - displayedPages
        } else {
            return currentPage > 0
        }
    };
    canZoomIn() {
        return !this.state.zooming && this.state.zoomIndex < this.zooms_().length - 1;
    };
    canZoomOut() {
        return !this.state.zooming && this.state.zoomIndex > 0;
    };
    zooms_() {
        return this.props.zooms || [1];
    }
    numPages() {
        if (this.props.pages[0] === null) {
            return this.props.pages.length - 1;
        } else {
            return this.props.pages.length;
        }
    };
    page() {
        if (this.props.pages[0] !== null) {
            return this.state.currentPage + 1;
        } else {
            return Math.max(1, this.state.currentPage);
        }
    };
    leftPage() {
        if (this.props.forwardDirection === 'right' || this.state.displayedPages === 1) {
            return this.state.firstPage;
        } else {
            return this.state.secondPage;
        }
    };
    rightPage() {
        if (this.props.forwardDirection === 'left') {
            return this.state.firstPage;
        } else {
            return this.state.secondPage;
        }
    };
    cursor() {
        if (this.state.activeCursor) {
            return this.state.activeCursor;
        } else if (IE) {
            return 'auto';
        } else if (this.canZoomIn()) {
            return 'zoom-in';
        } else if (this.canZoomOut()) {
            return 'zoom-out';
        } else {
            return 'grab';
        }
    };
    pageScale() {
        let scale, vw, xScale, yScale;
        vw = this.state.viewWidth / this.state.displayedPages;
        xScale = vw / this.state.imageWidth;
        yScale = this.state.viewHeight / this.state.imageHeight;
        scale = xScale < yScale ? xScale : yScale;
        if (scale < 1) {
            return scale;
        } else {
            return 1;
        }
    };
    pageWidth() {
        return Math.round(this.state.imageWidth * this.pageScale());
    };
    pageHeight() {
        return Math.round(this.state.imageHeight * this.pageScale());
    };
    xMargin() {
        return (this.state.viewWidth - this.pageWidth() * this.state.displayedPages) / 2;
    };
    yMargin() {
        return (this.state.viewHeight - this.pageHeight()) / 2;
    };

    boundingLeft() {
        let x;
        if (this.state.displayedPages === 1) {
            return this.xMargin();
        } else {
            x = this.pageUrl(this.leftPage()) ? this.xMargin() : this.state.viewWidth / 2;
            if (x < this.state.minX) {
                return x;
            } else {
                return this.state.minX;
            }
        }
    };
    boundingRight() {
        let x;
        if (this.state.displayedPages === 1) {
            return this.state.viewWidth - this.xMargin();
        } else {
            x = this.pageUrl(this.rightPage()) ? this.state.viewWidth - this.xMargin() : this.state.viewWidth / 2;
            if (x > this.state.maxX) {
                return x;
            } else {
                return this.state.maxX;
            }
        }
    };
    centerOffset() {
        let retval;
        retval = Math.round(this.state.viewWidth / 2 - (this.boundingLeft() + this.boundingRight()) / 2);
        /*if (this.state.currentCenterOffset === null && this.imageWidth !== null) {
            currentCenterOffset = retval;
        }
        this.setState({currentCenterOffset});*/
        return Math.round(retval);
    };
    /*centerOffsetSmoothed() {
        let centerOffsetSmoothed = Math.round(this.centerOffset());
        this.setState(centerOffsetSmoothed);
    };*/
    dragToScroll() {
        return !this.state.hasTouchEvents;
    };
    scrollLeftMin() {
        let w;
        w = (this.boundingRight() - this.boundingLeft()) * this.state.zoom;
        if (w < this.state.viewWidth) {
            return (this.boundingLeft() + this.centerOffset()) * this.state.zoom - (this.state.viewWidth - w) / 2;
        } else {
            return (this.boundingLeft() + this.centerOffset()) * this.state.zoom;
        }
    };
    scrollLeftMax() {
        let w;
        w = (this.boundingRight() - this.boundingLeft()) * this.state.zoom;
        if (w < this.state.viewWidth) {
            return (this.boundingLeft() + this.centerOffset()) * this.state.zoom - (this.state.viewWidth - w) / 2;
        } else {
            return (this.boundingRight() + this.centerOffset()) * this.state.zoom - this.state.viewWidth;
        }
    };
    scrollTopMin() {
        let h;
        h = this.pageHeight() * this.state.zoom;
        if (h < this.state.viewHeight) {
            return this.yMargin() * this.state.zoom - (this.state.viewHeight - h) / 2;
        } else {
            return this.yMargin() * this.state.zoom;
        }
    };
    scrollTopMax() {
        let h;
        h = this.pageHeight() * this.state.zoom;
        if (h < this.state.viewHeight) {
            return this.yMargin() * this.state.zoom - (this.state.viewHeight - h) / 2;
        } else {
            return (this.yMargin() + this.pageHeight()) * this.state.zoom - this.state.viewHeight;
        }
    };
    scrollLeftLimited() {
        return Math.min(this.scrollLeftMax(), Math.max(this.scrollLeftMin(), this.state.scrollLeft));
    };
    scrollTopLimited() {
        return Math.min(this.scrollTopMax(), Math.max(this.scrollTopMin(), this.state.scrollTop));
    };
    polygonWidth() {
        let w;
        w = this.pageWidth() / this.props.nPolygons;
        w = Math.ceil(w + 1 / this.state.zoom);
        return w + 'px';
    };
    polygonHeight() {
        return this.pageHeight() + 'px';
    };
    polygonBgSize() {
        return `${this.pageWidth()}px ${this.pageHeight()}px`;
    };
    /*polygonArray() {
        return this.makePolygonArray('front').concat(this.makePolygonArray('back'));
    };*/

    debounce(func, wait, immediate) {
        let timeout;
        return function() {
            let context = this, args = arguments;
            let later = () => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            let callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    componentDidMount() {
        let myEfficientFn = this.debounce(()=>{
            this.onResize()
        }, 250);
        window.addEventListener('resize', myEfficientFn, {
            passive: true
        });
        const objImg = this.preloadImages();
        this.onResize();
        //this.preloadImages();
        this.setState({ zoom: this.props.zooms[0], preloadedImages: objImg});
    }
    componentDidUpdate() {
        this.scrollLeftLimitedFunc(this.scrollLeftLimited());
        this.scrollTopLimitedFunc(this.scrollTopLimited());
    }
    
    scrollLeftLimitedFunc = (val) =>{
        if (IE) {
            return requestAnimationFrame(() => {
                return this.viewport.current.scrollLeft = val;
            });
        } else {
            return this.viewport.current.scrollLeft = val;
        }
    };
    scrollTopLimitedFunc = (val) => {
        if (IE) {
            return requestAnimationFrame(() => {
                return this.viewport.current.scrollTop = val;
            });
        } else {
            return this.viewport.current.scrollTop = val;
        }
    };
    onResize = () => {
        let resize;
        let viewport;
        viewport = this.viewport;
        if (!viewport.current) {
            return;
        }
        let currentPage = this.state.currentPage;
        let viewHeight = viewport.current.clientHeight;
        let viewWidth = viewport.current.clientWidth;
        let displayedPages = viewport.current.clientWidth > viewport.current.clientHeight && !this.props.singlePage ? 2 : 1;
        let minX = 2e308;
        let maxX = -2e308;

        resize = { viewHeight: viewHeight, viewWidth: viewWidth, displayedPages: displayedPages, minX: minX, maxX: maxX };
        //this.setState({viewHeight, viewWidth, displayedPages, minX});

        if (displayedPages === 2) {
            //this.setState((state) => ({ currentPage: state.currentPage & ~1 }));
            resize = { ...resize, currentPage: currentPage & ~1 }
        }
        if (displayedPages === 1 && currentPage === 0 && this.props.pages.length && !this.pageUrl(0)) {
            //this.setState((state) => ({ currentPage: state.currentPage + 1 }))
            resize = { ...resize, currentPage: currentPage + 1 }
        }
        const canFlipLeft = this.canFlipLeft();
        const canFlipRight = this.canFlipRight();
        this.setState({...resize, canFlipLeft, canFlipRight});
        //return resize;
    };
    preloadImages = (hiRes = false) => {
        let objImg = {};
        let i, img, j, k, ref, ref1, ref2, ref3, url;
        if (Object.keys(objImg).length >= 10) {
            objImg = {};
        }
        for (i = j = ref = this.state.currentPage - 3, ref1 = this.state.currentPage + 3; (ref <= ref1 ? j <= ref1 : j >= ref1); i = ref <= ref1 ? ++j : --j) {
            url = this.pageUrl(i);
            if (url) {
                if (!objImg[url]) {
                    img = new Image();
                    img.src = url;
                    objImg = { ...objImg, [url]: img }
                    //this.setState({ preloadedImages:{ ...this.state.preloadedImages, [url]: img } });
                }
            }
        }

        if (hiRes) {
            for (i = k = ref2 = this.state.currentPage, ref3 = this.state.currentPage + this.state.displayedPages; (ref2 <= ref3 ? k < ref3 : k > ref3); i = ref2 <= ref3 ? ++k : --k) {
                url = this.props.pagesHiRes[i];
                if (url) {
                    if (!objImg[url]) {
                        img = new Image();
                        img.src = url;
                        objImg = { ...objImg, [url]: img }
                        //this.setState({ preloadedImages:{ ...this.state.preloadedImages, [url]: img } });
                    }
                }
            }
        }
        //this.setState({preloadedImages: objImg})
        console.log(objImg)
        return objImg;
    };
    pageUrl = (page, hiRes = false) => {
        let url;
        if (hiRes && this.state.zoom > 1 && !this.state.zooming) {
            url = this.props.pagesHiRes[page];
            if (url) {
                return url;
            }
        }
        return this.props.pages[page] || null;
    };
    flipLeft = () => {
        if (!this.state.canFlipLeft) {
            return;
        }
        return this.flipStart('left', true);
    };
    flipRight = () => {
        if (!this.state.canFlipRight) {
            return;
        }
        return this.flipStart('right', true);
    };
    flipStart = (direction, auto) => {
        let flip = {
            progress: 0,
            direction: direction,
            frontImage: null,
            backImage: null,
            auto: auto,
            opacity: 1
        };
        if (direction !== this.props.forwardDirection) {
            if (this.state.displayedPages === 1) {
                flip.frontImage = this.pageUrl(this.state.currentPage-1);
                flip.backImage = null;
            } else {
                flip.frontImage = this.pageUrl(this.state.firstPage);
                flip.backImage = this.pageUrl(this.state.currentPage - this.state.displayedPages + 1);
            }
        } else {
            if (this.state.displayedPages === 1) {
                flip.frontImage = this.pageUrl(this.state.currentPage);
                flip.backImage = null;
            } else {
                flip.frontImage = this.pageUrl(this.state.secondPage);
                flip.backImage = this.pageUrl(this.state.currentPage + this.state.displayedPages);
            }
        }
        const { forwardDirection } = this.props;

        const forward = direction === forwardDirection;
        this.setState({
            flip,
            firstPage: this.state.firstPage + (forward ? 0 : -this.state.displayedPages),
            secondPage: this.state.secondPage + (forward ? this.state.displayedPages : 0),
            polygonArray: this.makePolygonArray('front', flip).concat(this.makePolygonArray('back', flip))
        }, () => {
            if (auto) {
                this.flipAuto(true);
            }
        });
    };
    flipAuto = (ease) => {
        let animate, duration, startRatio, t0;
        t0 = Date.now();
        duration = this.props.flipDuration * (1 - this.state.flip.progress);
        startRatio = this.state.flip.progress;
        this.setState({flip: { ...this.state.flip, auto: true}});
        animate = () => {
            return requestAnimationFrame(() => {
                let ratio, t;
                const { displayedPages, currentPage } = this.state;
                const forward = this.state.flip.direction === this.props.forwardDirection;
                const newCurrentPage = currentPage + (forward ? displayedPages: -displayedPages);
                let firstPage = newCurrentPage, secondPage = newCurrentPage + 1;
                t = Date.now() - t0;
                ratio = startRatio + t / duration;
                if (ratio > 1) {
                    ratio = 1;
                    if (this.state.flip.direction !== this.props.forwardDirection) {
                        if (this.state.displayedPages === 2) {
                            firstPage = newCurrentPage;
                            secondPage = newCurrentPage + 1;
                        }
                    } else {
                        if (this.state.displayedPages === 1) {
                            firstPage = newCurrentPage;
                        } else {
                            firstPage = newCurrentPage;
                            secondPage = newCurrentPage + 1;
                        }
                    }
                }
                let flip = {...this.state.flip, progress: ease ? easeInOut(ratio) : ratio};
                this.setState({ polygonArray: this.makePolygonArray('front', flip).concat(this.makePolygonArray('back', flip)) });
                if (ratio < 1) {
                    return animate();
                } else {
                    if (this.state.displayedPages === 1 && forward) {
                        flip = {...this.state.flip, direction: null}
                    } else {
                        this.onImageLoad(1, this.setState({ flip: { ...this.state.flip, direction: null } }));
                    }
                    const canFlipForward = newCurrentPage < this.props.pages.length - displayedPages;
                    const canFlipBackward = newCurrentPage > 0;
                    let canFlipLeft, canFlipRight;

                    if (this.props.forwardDirection === 'left') {
                        canFlipLeft = canFlipForward;
                        canFlipRight = canFlipBackward;
                    } else {
                        canFlipLeft = canFlipBackward;
                        canFlipRight = canFlipForward;
                    }
                    this.setState({
                        flip: { ...flip, auto: false, direction: null },
                        polygonArray: [],
                        currentPage: newCurrentPage,
                        firstPage,
                        secondPage,
                        canFlipRight,
                        canFlipLeft
                    });
                }
            });
        };
        return animate();
    };
    flipRevert = () => {
        let animate, duration, startRatio, t0;
        t0 = Date.now();
        duration = this.props.flipDuration * this.state.flip.progress;
        startRatio = this.state.flip.progress;
        this.setState({flip: { ...this.state.flip, auto: true}});
        animate = () => {
            return requestAnimationFrame(() => {
                let ratio, t;
                const { displayedPages, currentPage } = this.state;
                //const forward = this.state.flip.direction === this.props.forwardDirection;
                //const newCurrentPage = currentPage + (forward ? displayedPages: -displayedPages);
                let firstPage = currentPage, secondPage = currentPage + 1;
                t = Date.now() - t0;
                ratio = startRatio - startRatio * t / duration;
                if (ratio < 0) {
                    ratio = 0;
                }
                //this.flip.progress = ratio;
                let flip = {...this.state.flip, progress: ratio};
                this.setState({ polygonArray: this.makePolygonArray('front', flip).concat(this.makePolygonArray('back', flip)) });
                if (ratio > 0) {
                    return animate();
                } else {
                    firstPage = currentPage;
                    secondPage = currentPage + 1;
                    if (displayedPages === 1 && flip.direction !== this.props.forwardDirection) {
                        flip.direction = null;
                    } else {
                        this.onImageLoad(1, this.setState({flip: {...this.state.flip, direction: null}}));
                    }
                    const canFlipForward = currentPage < this.props.pages.length - displayedPages;
                    const canFlipBackward = currentPage > 0;
                    let canFlipLeft, canFlipRight;

                    if (this.props.forwardDirection === 'left') {
                        canFlipLeft = canFlipForward;
                        canFlipRight = canFlipBackward;
                    } else {
                        canFlipLeft = canFlipBackward;
                        canFlipRight = canFlipForward;
                    }
                    this.setState({
                        currentPage: currentPage,
                        firstPage,
                        secondPage,
                        canFlipLeft,
                        canFlipRight,
                        flip: {...flip, auto: false, direction: null},
                        polygonArray: []
                    });
                }
            });
        };
        return animate();
    };
    onImageLoad = (trigger) => {
        this.setState(
            {
                nImageLoadTrigger: trigger,
                nImageLoad: 0,
            }
        )
    };
    didLoadImage = (ev) => {
        if (this.state.imageWidth === null) {
            this.setState({ imageWidth: (ev.target || ev.path[0]).naturalWidth, imageHeight: (ev.target || ev.path[0]).naturalHeight });
        }
        if (!this.state.imageLoadCallback) {
            return;
        }
        //?
        if (this.state.nImageLoad >= this.state.nImageLoadTrigger) {
            this.state.imageLoadCallback();
            return this.setState({imageLoadCallback: null});
        }
    };

    makePolygonArray = (face, flip) => {
        let bgImg, bgPos, dRadian, dRotate, i, image, j, lighting, m, originRight, pageMatrix, pageRotation, pageX, polygonWidth, rad, radian, radius, ref, results, rotate, theta, x, x0, x1, z;
        let { progress, direction } = flip;
        if (!direction) {
            return [];
        }
        //console.log(progress)
        if (this.state.displayedPages === 1 && direction !== this.props.forwardDirection) {
            progress = 1 - progress;
            direction = this.props.forwardDirection;
        }
        //this.state.flip.opacity = this.state.displayedPages === 1 && progress > .7 ? 1 - (progress - .7) / .3 : 1;
        this.setState({flip: {...flip, opacity: this.state.displayedPages === 1 && progress > .7 ? 1 - (progress - .7) / .3 : 1}})
        image = face === 'front' ? flip.frontImage : flip.backImage;
        bgImg = image && `url('${image}')`;
        polygonWidth = this.pageWidth() / this.props.nPolygons;
        pageX = this.xMargin();
        originRight = false;
        if (this.state.displayedPages === 1) {
            if (this.props.forwardDirection === 'right') {
                if (face === 'back') {
                    originRight = true;
                    pageX = this.xMargin() - this.pageWidth();
                }
            } else {
                if (direction === 'left') {
                    if (face === 'back') {
                        pageX = this.pageWidth() - this.xMargin();
                    } else {
                        originRight = true;
                    }
                } else {
                    if (face === 'front') {
                        pageX = this.pageWidth() - this.xMargin();
                    } else {
                        originRight = true;
                    }
                }
            }
        } else {
            if (direction === 'left') {
                if (face === 'back') {
                    pageX = this.state.viewWidth / 2;
                } else {
                    originRight = true;
                }
            } else {
                if (face === 'front') {
                    pageX = this.state.viewWidth / 2;
                } else {
                    originRight = true;
                }
            }
        }
        pageMatrix = new Matrix();
        pageMatrix.translate(this.state.viewWidth / 2);
        pageMatrix.perspective(this.props.perspective);
        pageMatrix.translate(-this.state.viewWidth / 2);
        pageMatrix.translate(pageX, this.yMargin());
        pageRotation = 0;
        if (progress > 0.5) {
            pageRotation = -(progress - 0.5) * 2 * 180;
        }
        if (direction === 'left') {
            pageRotation = -pageRotation;
        }
        if (face === 'back') {
            pageRotation += 180;
        }
        if (pageRotation) {
            if (originRight) {
                pageMatrix.translate(this.pageWidth());
            }
            pageMatrix.rotateY(pageRotation);
            if (originRight) {
                pageMatrix.translate(-this.pageWidth());
            }
        }
        //console.log(pageRotation)
        //console.log(pageMatrix)
        if (progress < 0.5) {
            theta = progress * 2 * Math.PI;
        } else {
            theta = (1 - (progress - 0.5) * 2) * Math.PI;
        }
        if (theta === 0) {
            theta = 1e-9;
        }
        radius = this.pageWidth() / theta;
        radian = 0;
        dRadian = theta / this.props.nPolygons;
        rotate = dRadian / 2 / Math.PI * 180;
        dRotate = dRadian / Math.PI * 180;
        if (originRight) {
            rotate = -theta / Math.PI * 180 + dRotate / 2;
        }
        if (face === 'back') {
            rotate = -rotate;
            dRotate = -dRotate;
        }
        //this.minX = 2e308;
        //this.maxX = -2e308;
        this.setState({ minX: 2e308, maxX: -2e308 });
        results = [];
        for (i = j = 0, ref = this.props.nPolygons; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
            bgPos = `${i / (this.props.nPolygons - 1) * 100}% 0px`;
            m = pageMatrix.clone();
            rad = originRight ? theta - radian : radian;
            x = Math.sin(rad) * radius;
            if (originRight) {
                x = this.pageWidth() - x;
            }
            z = (1 - Math.cos(rad)) * radius;
            if (face === 'back') {
                z = -z;
            }
            m.translate3d(x, 0, z);
            m.rotateY(-rotate);
            x0 = m.transformX(0);
            x1 = m.transformX(polygonWidth);
            this.setState({maxX: Math.max(Math.max(x0, x1), this.state.maxX), minX: Math.min(Math.min(x0, x1), this.state.minX), canFlipRight: false, canFlipLeft: false});
            //this.maxX = Math.max(Math.max(x0, x1), this.maxX);
            //this.minX = Math.min(Math.min(x0, x1), this.minX);
            lighting = this.computeLighting(pageRotation - rotate, dRotate);
            radian += dRadian;
            rotate += dRotate;
            results.push([face + i, bgImg, lighting, bgPos, m.toString(), Math.abs(Math.round(z))]);
        }
        return results;
    };
    computeLighting = (rot, dRotate) => {
        let DEG, POW, blackness, diffuse, gradients, lightingPoints, specular;
        gradients = [];
        lightingPoints = [-0.5, -0.25, 0, 0.25, 0.5];
        if (this.props.ambient < 1) {
            blackness = 1 - this.props.ambient;
            diffuse = lightingPoints.map((d) => {
                return (1 - Math.cos((rot - dRotate * d) / 180 * Math.PI)) * blackness;
            });
            gradients.push(`linear-gradient(to right,\n  rgba(0, 0, 0, ${diffuse[0]}),\n  rgba(0, 0, 0, ${diffuse[1]}) 25%,\n  rgba(0, 0, 0, ${diffuse[2]}) 50%,\n  rgba(0, 0, 0, ${diffuse[3]}) 75%,\n  rgba(0, 0, 0, ${diffuse[4]}))`);
        }
        if (this.props.gloss > 0 && !IE) {
            DEG = 30;
            POW = 200;
            specular = lightingPoints.map((d) => {
                return Math.max(Math.cos((rot + DEG - dRotate * d) / 180 * Math.PI) ** POW, Math.cos((rot - DEG - dRotate * d) / 180 * Math.PI) ** POW);
            });
            gradients.push(`linear-gradient(to right,\n  rgba(255, 255, 255, ${specular[0] * this.props.gloss}),\n  rgba(255, 255, 255, ${specular[1] * this.props.gloss}) 25%,\n  rgba(255, 255, 255, ${specular[2] * this.props.gloss}) 50%,\n  rgba(255, 255, 255, ${specular[3] * this.props.gloss}) 75%,\n  rgba(255, 255, 255, ${specular[4] * this.props.gloss}))`);
        }
        return gradients.join(',');
    };
    zoomIn = () => {
        let zoomIndexState = this.state.zoomIndex;
        if (!this.canZoomIn()) {
            return;
        }
        let zoomIndex = ++zoomIndexState;
        this.setState({zoomIndex});
        return this.zoomTo(this.zooms_()[zoomIndex]);
    };
    zoomOut = () => {
        let zoomIndexState = this.state.zoomIndex;
        if (!this.canZoomOut()) {
            return;
        }
        let zoomIndex = zoomIndexState - 1;
        this.setState({zoomIndex});
        return this.zoomTo(this.zooms_()[zoomIndex]);
    };
    zoomAt = (touch) => {
        let rect, x, y;
        rect = this.viewport.current.getBoundingClientRect();
        x = touch.pageX - rect.left;
        y = touch.pageY - rect.top;
        this.setState({zoomIndex: (this.state.zoomIndex + 1) % this.zooms_().length});
        return this.zoomTo(this.zooms_()[this.state.zoomIndex], x, y);
    };
    zoomTo = (zoom, fixedX, fixedY) => {
        let animate, containerFixedX, containerFixedY, end, endX, endY, start, startX, startY, t0, viewport;
        start = this.state.zoom;
        end = zoom;
        viewport = this.viewport.current;
        startX = viewport.scrollLeft;
        startY = viewport.scrollTop;
        fixedX || (fixedX = viewport.clientWidth / 2);
        fixedY || (fixedY = viewport.clientHeight / 2);
        containerFixedX = fixedX + startX;
        containerFixedY = fixedY + startY;
        endX = containerFixedX / start * end - fixedX;
        endY = containerFixedY / start * end - fixedY;
        t0 = Date.now();
        this.setState({zooming: true});
        animate = () => {
            return requestAnimationFrame(() => {
                let ratio, t;
                t = Date.now() - t0;
                ratio = t / this.props.zoomDuration;
                if (ratio > 1 || IE) {
                    ratio = 1;
                }
                ratio = easeInOut(ratio);
                this.setState({
                    zoom: start + (end - start) * ratio,
                    scrollLeft: startX + (endX - startX) * ratio,
                    scrollTop: startY + (endY - startY) * ratio
                });
                if (t < this.props.zoomDuration) {
                    return animate();
                } else {
                    this.setState({
                        zooming: false,
                        zoom: zoom,
                        scrollLeft: endX,
                        scrollTop: endY
                    });
                }
            });
        };
        animate();
        if (end > 1) {
            return this.preloadImages(true);
        }
    };
    swipeStart = (touch) => {
        const touchStartX = touch.pageX, touchStartY = touch.pageY, maxMove = 0;
        let activeCursor, startScrollLeft, startScrollTop;
        if (this.state.zoom <= 1) {
            activeCursor = 'grab';
        } else {
            startScrollLeft = this.viewport.current.scrollLeft;
            startScrollTop = this.viewport.current.scrollTop;
            activeCursor = 'all-scroll'
        }
        this.setState({
            touchStartX,
            touchStartY,
            maxMove,
            activeCursor,
            startScrollLeft,
            startScrollTop
        });
    };
    swipeMove = (touch) => {
        let flip = {
            progress: 0,
            direction: null,
            frontImage: null,
            backImage: null,
            auto: false,
            opacity: 1
        };
        let x, y, maxMove, forward;
        const activeCursor = 'grabbing';
        if (this.state.touchStartX === null) {
            return;
        }
        x = touch.pageX - this.state.touchStartX;
        y = touch.pageY - this.state.touchStartY;
        maxMove = Math.max(this.state.maxMove, Math.abs(x));
        maxMove = Math.max(this.state.maxMove, Math.abs(y));
        if (this.state.zoom > 1) {
            if (!this.state.hasTouchEvents) {
                this.dragScroll(x, y);
            }
            return;
        }
        if (Math.abs(y) > Math.abs(x)) {
            return;
        }
        if (x > 0) {
            if (flip.direction === null && this.canFlipLeft() && x >= this.props.swipeMin) {
                flip.direction = 'left';
                forward = flip.direction === this.props.forwardDirection;
                if (flip.direction !== this.props.forwardDirection) {
                    if (this.state.displayedPages === 1) {
                        flip.frontImage = this.pageUrl(this.state.currentPage - 1);
                        flip.backImage = null;
                    } else {
                        flip.frontImage = this.pageUrl(this.state.currentPage);
                        flip.backImage = this.pageUrl(this.state.currentPage - this.state.displayedPages + 1);
                    }
                } else {
                    if (this.state.displayedPages === 1) {
                        flip.frontImage = this.pageUrl(this.state.currentPage);
                        flip.backImage = null;
                    } else {
                        flip.frontImage = this.pageUrl(this.state.currentPage + 1);
                        flip.backImage = this.pageUrl(this.state.currentPage + this.state.displayedPages);
                    }
                }
                /*if (flip.direction === null && this.canFlipLeft() && x >= this.props.swipeMin) {
                    this.flipStart('left', false);
                }*/
                if (flip.direction === 'left') {
                    flip.progress = x / this.pageWidth();
                    if (flip.progress > 1) {
                        flip.progress = 1;
                    }
                }
            }
        } else {
            if (flip.direction === null && this.canFlipRight() && x <= -this.props.swipeMin) {
                console.log('right');
                flip.direction = 'right';
                forward = flip.direction === this.props.forwardDirection;
                if (flip.direction !== this.props.forwardDirection) {
                    if (this.state.displayedPages === 1) {
                        flip.frontImage = this.pageUrl(this.state.currentPage-1);
                        flip.backImage = null;
                    } else {
                        flip.frontImage = this.pageUrl(this.state.currentPage);
                        flip.backImage = this.pageUrl(this.state.currentPage - this.state.displayedPages + 1);
                    }
                } else {
                    if (this.state.displayedPages === 1) {
                        flip.frontImage = this.pageUrl(this.state.currentPage);
                        flip.backImage = null;
                    } else {
                        flip.frontImage = this.pageUrl(this.state.currentPage + 1);
                        flip.backImage = this.pageUrl(this.state.currentPage + this.state.displayedPages);
                    }
                }
                /*if (flip.direction === null && this.canFlipRight() && x <= -this.props.swipeMin) {
                    this.flipStart('right', false);
                }*/
                if (flip.direction === 'right') {
                    flip.progress = -x / this.pageWidth();
                    if (flip.progress > 1) {
                        flip.progress = 1;
                    }
                }
            }
        }
        this.setState({
            maxMove,
            activeCursor,
            flip,
            firstPage: this.state.currentPage + (forward ? 0 : -this.state.displayedPages),
            secondPage: this.state.currentPage + 1 + (forward ? this.state.displayedPages : 0),
            polygonArray: this.makePolygonArray('front', flip).concat(this.makePolygonArray('back', flip))
        });
        return true;
    };
    swipeEnd = (touch) => {
        if (this.state.touchStartX === null) {
            return;
        }
        if (this.state.maxMove < this.props.swipeMin) {
            this.zoomAt(touch);
        }
        if (this.state.flip.direction !== null && !this.state.flip.auto) {
            if (this.state.flip.progress > 1 / 4) {
                this.flipAuto(false);
            } else {
                this.flipRevert();
            }
        }
        this.setState({
            touchStartX: null,
            activeCursor: null
        });
    };
    onTouchStart = (ev) => {
        this.setState({ hasTouchEvents: true});
        return this.swipeStart(ev.changedTouches[0]);
    };
    onTouchMove = (ev) => {
        if (this.swipeMove(ev.changedTouches[0])) {
            if (ev.cancelable) {
                return ev.preventDefault();
            }
        }
    };
    onTouchEnd = (ev) => {
        return this.swipeEnd(ev.changedTouches[0]);
    };
    onPointerDown = (ev) => {
        let hasTouchEvents = true;
        if (hasTouchEvents) {
            return;
        }
        if (ev.which && ev.which !== 1) { // Ignore right-click
            return;
        }
        this.swipeStart(ev);
        try {
            return ev.target.setPointerCapture(ev.pointerId);
        } catch (error) {

        }
        this.setState({ hasTouchEvents });
    };
    onPointerMove = (ev) => {
        if (!this.state.hasTouchEvents) {
            return this.swipeMove(ev);
        }
    };
    onPointerUp = (ev) => {
        if (this.state.hasTouchEvents) {
            return;
        }
        this.swipeEnd(ev);
        try {
            return ev.target.releasePointerCapture(ev.pointerId);
        } catch (error) {

        }
    };
    onMouseDown = (ev) => {
        if (this.state.hasTouchEvents || this.state.hasPointerEvents) {
            return;
        }
        if (ev.which && ev.which !== 1) { // Ignore right-click
            return;
        }
        return this.swipeStart(ev);
    };
    onMouseMove = (ev) => {
        if (!(this.state.hasTouchEvents || this.state.hasPointerEvents)) {
            return this.swipeMove(ev);
        }
    };
    onMouseUp = (ev) => {
        if (!(this.state.hasTouchEvents || this.state.hasPointerEvents)) {
            return this.swipeEnd(ev);
        }
    };
    onWheel = (ev) => {
        if (this.state.zoom > 1 && this.dragToScroll()) {
            this.setState({scrollLeft: this.viewport.current.scrollLeft + ev.deltaX, scrollTop: this.viewport.current.scrollTop + ev.deltaY});
            if (ev.cancelable) {
                return ev.preventDefault();
            }
        }
    };
    dragScroll = (x, y) => {
        this.setState({scrollLeft: this.state.startScrollLeft - x, scrollTop: this.state.startScrollTop - y});
    };

    render() {
        const polygonArray = this.state.polygonArray;
        const ant = polygonArray.map((item) =>
            <div
                className="polygon"
                key={item[0]}
                style={{
                    backgroundImage: item[1],
                    backgroundPosition: item[3],
                    transform: item[4],
                    zIndex: item[5]+1,
                    backgroundSize: this.polygonBgSize(),
                    width: this.polygonWidth(),
                    height: this.polygonHeight()
                }}
            >
                <div className="lighting" style={{backgroundImage: item[2]}}/>
            </div>
        );
        return(
            <div className="flipbook">
                <ActionBar zoomIn={this.zoomIn} zoomOut={this.zoomOut} flipRight={this.flipRight} flipLeft={this.flipLeft} page={this.page()} numPages={this.numPages()}/>
                <div
                    ref={this.viewport}
                    className="viewport"
                    style={{ cursor: this.cursor === 'grabbing' ? 'grabbing' : 'auto' }}
                    onTouchMove={this.onTouchMove}
                    onMouseMove={this.onMouseMove}
                    onPointerMove={this.onPointerMove}
                    onTouchEnd={this.onTouchEnd}
                    onTouchCancel={this.onTouchEnd}
                    onPointerUp={this.onPointerUp}
                    onPointerCancel={this.onPointerUp}
                    onMouseUp={this.onMouseUp}
                    onWheel={this.onWheel}
                >
                    <div className="container" style={{ transform: `scale(${this.state.zoom})` }}>
                        <div
                            className="click-to-flip left"
                            onClick={this.flipLeft}
                            style={{cursor: this.state.canFlipLeft ? 'pointer' : 'auto'}}
                        />
                        <div
                            className="click-to-flip right"
                            onClick={this.flipRight}
                            style={{cursor: this.state.canFlipRight ? 'pointer' : 'auto'}}
                        />
                        <div>
                            <div style={{transform: `translateX(${this.centerOffset()}px)`}}>
                                {
                                    (this.pageUrl(this.leftPage()) ?
                                        <img
                                            className="page"
                                            alt=""
                                            style={{
                                                width: `${this.pageWidth()}px`,
                                                height: `${this.pageHeight()}px`,
                                                left: `${this.xMargin()}px`,
                                                top: `${this.yMargin()}px`
                                            }}
                                            src={this.pageUrl(this.leftPage(), true)}
                                            onLoad={this.didLoadImage}
                                        /> : null)
                                }
                                {
                                    (this.pageUrl(this.rightPage()) && this.state.displayedPages === 2 ?
                                        <img
                                            className="page"
                                            alt=""
                                            style={{
                                                width: `${this.pageWidth()}px`,
                                                height: `${this.pageHeight()}px`,
                                                left: `${this.state.viewWidth/2}px`,
                                                top: `${this.yMargin()}px`
                                            }}
                                            src={this.pageUrl(this.rightPage(), true)}
                                            onLoad={this.didLoadImage}
                                        /> : null)
                                }
                                <div style={{opacity: `${this.state.flip.opacity}`}}>
                                    {ant}
                                </div>
                                <div
                                    className="bounding-box"
                                    style={{
                                        left: `${this.boundingLeft()}px`,
                                        top: `${this.yMargin()}px`,
                                        width: `${this.boundingRight() - this.boundingLeft()}px`,
                                        height: `${this.pageHeight()}px`,
                                        cursor: this.cursor()
                                    }}
                                    onTouchStart={this.onTouchStart}
                                    onPointerDown={this.onPointerDown}
                                    onMouseDown={this.onMouseDown}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

Flipbook.propTypes = {
    pages: PropTypes.array.isRequired,
    pagesHiRes: PropTypes.array,
    forwardDirection: PropTypes.oneOf(['left', 'right']),
    flipDuration: PropTypes.number,
    singlePage: PropTypes.bool,
    nPolygons: PropTypes.number,
    perspective: PropTypes.number,
    ambient: PropTypes.number,
    gloss: PropTypes.number,
    swipeMin: PropTypes.number,
    zoomDuration: PropTypes.number,
    zooms: PropTypes.array
};

export default Flipbook;