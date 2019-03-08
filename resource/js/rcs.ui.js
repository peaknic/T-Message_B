// requestAnimationFrame polyfill
// http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/

;(function () {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());


/*
 *  Project: Sprite Animate
 *  Description: Animate a sprite sheet using canvas and requestAnimationFrame
 *  Author: Justin Walker
 *
 *  Resources:
 *  http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/
 *  https://github.com/jquery-boilerplate/jquery-boilerplate/wiki/Extending-jQuery-Boilerplate
 *
 */

;(function ($, window, document, undefined) {


    // Create the defaults once
    var pluginName = 'spriteAnimate',
        defaults = {
            frameWidth: null,
            frameHeight: null,
            numberOfFrames: null,
            imgSrc: null,
            fps: null,
            loop: true,
            jumpFrame: null,
            debug: false,
            onReady: function () {
            },
            onFinish: function () {
            }
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.el = element;
        this.$el = $(element);

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.options = $.extend({}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        // shared variables
        this.animation = null;
        this.isPaused = true;
        this.rafLoop = undefined;

        this.init();
    }

    function sprite(options) {

        var that = {},
            frameIndex = 0,
            indexChanged = true,
            frameLength = Math.ceil(1000 / options.fps),
            lastFrame = 0,
            numberOfFrames = options.numberOfFrames || 1,
            loop = options.loop,
            jumpFrame = options.jumpFrame,
            debug = options.debug,
            onReady = options.onReady,
            onFinish = options.onFinish;

        that.context = options.context;
        that.width = options.width;
        that.height = options.height;
        that.frameWidth = options.frameWidth;
        that.frameHeight = options.frameHeight;
        that.columns = options.width / options.frameWidth;
        that.image = options.image;


        that.update = function () {

            var now = Date.now();

            if ((now - lastFrame) > frameLength) {

                tickCount = 0;
                lastFrame = now;

                // If the current frame index is in range
                if (frameIndex < numberOfFrames - 1) {
                    // Go to the next frame
                    frameIndex += 1;
                } else if (!loop) {
                    // already at the last frame, exit
                    onFinish();
                    return false;
                } else {
                    // reset frame index
                    if (isInt(jumpFrame)) {
                        // jump frame was specified, reset with this value
                        frameIndex = jumpFrame;
                    } else {
                        frameIndex = 0;
                    }
                }

                indexChanged = true;
            } else {
                indexChanged = false;
            }

            return true;
        };

        that.goTo = function (index) {
            if (index <= numberOfFrames - 1) {
                frameIndex = index;
                indexChanged = true;
            } else {
                console.error('spriteAnimate: Invalid Frame Index (' + index + ')');
            }
        }

        that.reset = function () {
            frameIndex = 0;
            indexChanged = true;
        }

        that.getIndex = function () {
            return frameIndex;
        }

        that.forwardUpdate = function () {
            // If the current frame index is in range
            if (frameIndex < numberOfFrames - 1) {
                // Go to the next frame
                frameIndex += 1;
            } else {
                frameIndex = 0;
            }
            indexChanged = true;
        }

        that.backwardUpdate = function () {
            // If the current frame index is in range
            if (frameIndex == 0) {
                // Go to the next frame
                frameIndex = numberOfFrames - 1;
            } else {
                frameIndex -= 1;
            }
            indexChanged = true;
        }

        that.render = function () {
            // wait for index change to repaint
            if (indexChanged) {
                // Clear the canvas
                that.context.clearRect(0, 0, that.width, that.height);


                var col = (frameIndex + 1) % that.columns;
                var row = Math.ceil((frameIndex + 1) / that.columns);

                if (col == 0) {
                    col = that.columns;
                }

                var sx = (col - 1) * that.frameWidth;
                var sy = (row - 1) * that.frameHeight;

                // Draw the animation
                that.context.drawImage(
                    that.image,
                    sx,
                    sy,
                    that.frameWidth,
                    that.frameHeight,
                    0,
                    0,
                    that.frameWidth,
                    that.frameHeight);

                if (debug) {
                    // draw frame number
                    that.context.fillStyle = "#42C31F";
                    that.context.font = "16px sans-serif";
                    that.context.fillText("Frame: " + (frameIndex + 1), 10, that.frameHeight - 10);
                }
            }
        };

        that.ready = function () {
            onReady();
        };


        return that;
    }

    function isInt(n) {
        return Number(n) === n && n % 1 === 0;
    }

    function isFloat(n) {
        return n === Number(n) && n % 1 !== 0;
    }


    // Private Methods
    // ============================

    Plugin.prototype._animationLoop = function () {

        var that = this;

        function loop() {
            that.rafLoop = window.requestAnimationFrame(loop);

            if (!that.isPaused) {
                if (that.animation.update()) {
                    that.animation.render();
                } else {
                    that._stopAnimationLoop();
                    that.$el.trigger('ended');
                }
            }
        }

        loop();
    }

    Plugin.prototype._stopAnimationLoop = function () {
        if (this.rafLoop) {
            window.cancelAnimationFrame(this.rafLoop);
            this.rafLoop = undefined;
        }

    }

    Plugin.prototype.init = function () {

        var that,
            canvas,
            options,
            spriteImage;

        // Get canvas
        canvas = this.el;
        canvas.width = this.options.frameWidth;
        canvas.height = this.options.frameHeight;
        // create reference
        that = this;
        options = this.options;
        // Create sprite sheet
        spriteImage = new Image();
        // Load sprite sheet
        spriteImage.addEventListener("load", function () {
            // Create sprite
            that.animation = sprite({
                context: canvas.getContext("2d"),
                width: spriteImage.width,
                height: spriteImage.height,
                frameWidth: options.frameWidth,
                frameHeight: options.frameHeight,
                image: spriteImage,
                numberOfFrames: options.numberOfFrames,
                fps: options.fps,
                loop: options.loop,
                jumpFrame: options.jumpFrame,
                debug: options.debug,
                onReady: options.onReady,
                onFinish: options.onFinish
            });
            // render first frame
            that.animation.render();
            // remove background
            $(canvas).addClass('loaded');
            that._animationLoop();
            // let everyone know it's ready!
            // set a timeout to allow image to be painted and loop to be started
            window.setTimeout(function () {
                that.animation.ready();
            }, 10);
        });
        // set image url
        spriteImage.src = this.options.imgSrc;

        // if debug add keyboard controls and frame numbers
        if (this.options.debug) {
            $(document).keydown(function (e) {
                if (e.keyCode == 39) {
                    that.animation.forwardUpdate();
                    that.animation.render();
                }
                if (e.keyCode == 37) {
                    that.animation.backwardUpdate();
                    that.animation.render();
                }
            });
            $(canvas).css('outline', '1px dashed red');
        }

    };


    // Public Methods
    // ============================


    Plugin.prototype.play = function () {
        this.isPaused = false;
    }

    Plugin.prototype.pause = function () {
        this.isPaused = true;
    }

    Plugin.prototype.restart = function () {
        this.animation.reset();
        this.animation.render();
        this._animationLoop();
    }

    Plugin.prototype.goTo = function (index) {
        if (isInt(index)) {
            this.animation.goTo(index);
            this.animation.render();
        } else {
            console.error('spriteAnimate: Not a valid integer');
        }
    }

    Plugin.prototype.getIndex = function () {
        return this.animation.getIndex();
    }


    // You don't need to change something below:
    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations and allowing any
    // public function (ie. a function whose name doesn't start
    // with an underscore) to be called via the jQuery plugin,
    // e.g. $(element).defaultPluginName('functionName', arg1, arg2)
    $.fn[pluginName] = function (options) {
        var args = arguments;

        // Is the first parameter an object (options), or was omitted,
        // instantiate a new instance of the plugin.
        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                // Only allow the plugin to be instantiated once,
                // so we check that the element has no plugin instantiation yet
                if (!$.data(this, 'plugin_' + pluginName)) {

                    // if it has no instance, create a new one,
                    // pass options to our plugin constructor,
                    // and store the plugin instance
                    // in the elements jQuery data object.
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
                }
            });

            // If the first parameter is a string and it doesn't start
            // with an underscore or "contains" the `init`-function,
            // treat this as a call to a public method.
        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {

            // Cache the method call
            // to make it possible
            // to return a value
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                // Tests that there's already a plugin-instance
                // and checks that the requested public method exists
                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    // Call the method of our plugin instance,
                    // and pass it the supplied arguments.
                    returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                    $.data(this, 'plugin_' + pluginName, null);
                }
            });

            // If the earlier cached method
            // gives a value back return the value,
            // otherwise return this to preserve chainability.
            return returns !== undefined ? returns : this;
        }
    };

}(jQuery, window, document));

var RCSUI = (function () {
    var root = this;


    var init = function () {
        $("body").mCustomScrollbar({
            scrollInertia: 800,
            mouseWheel: {scrollAmount: 800},
            callbacks: {
                whileScrolling: function () {
                    if (this.mcs.draggerTop >= 200) {
                        $('.header, .quick').addClass('scrolling');
                    } else {
                        $('.header, .quick').removeClass('scrolling');
                    }
                }
            }
        });

        $(".charting .msgs__scroll, .hashtag-scroll, .benefit-cards-scroll, .brand-scroll, .picks__scroll.is-scrolled").mCustomScrollbar({
            scrollInertia: 800,
            mouseWheel: {scrollAmount: 800},
            axis: "x",
            setLeft: "0px"
        });
        $(".picks__scroll.is-scrolled").mCustomScrollbar({
            scrollInertia: 800,
            mouseWheel: {scrollAmount: 800}, axis: "x", setLeft: "0px",
            advanced: {
                autoExpandHorizontalScroll: true
            }
        });

        $('.default-box, .chartbot-list').height($(window).height());

        //채팅 - 스타벅스
        $('.link-chart2').on("click", function (e) {
            $('.sb-chart').addClass('open');
        });

        //채팅 - 마켓컬리
        $('.link-chart3').on("click", function (e) {
            $('.mk-chart1').addClass('open');
        });

        //채팅 - 신한은행
        $('.link-chart4').on("click", function (e) {
            $('.sh-chart').addClass('open');
        });


        //채팅 - 국민카드
        $('.link-chart5').on("click", function (e) {
            $('.kb-chart').addClass('open');
        });

        $('.move-brandhome-kb').on("click", function (e) {
            $('.mCSB_container').css('height', '100%');
            $('.brandhome-kb').addClass('open notransform');
        });

        $('.kb-keyword2').on("click", function (e) {
            $(".benefit-cards-scroll").mCustomScrollbar("destroy");
            $('.kb-hidden1').delay(100).fadeIn();
            $('.kb-hidden2').delay(1000).fadeIn();
            $('.kb-hidden3').delay(1500).fadeIn(function () {
                $(".benefit-cards-scroll").mCustomScrollbar({
                    scrollInertia: 500,
                    mouseWheel: {scrollAmount: 500}, axis: "x", setLeft: "0px"
                });
                $("body, html, .scroll-views").animate({scrollTop: $('.scroll-views').height()}, 0);
            });
        });

        $('.kb-hidden3 a').on("click", function (e) {
            var alt = $(this).find('img').attr("alt");
            $('.kb-hidden4 .txt').text(alt);
            $('.kb-hidden4').show();

            $("body, html, .scroll-views").animate({scrollTop: $('.scroll-views').height()}, 0);
        });

        $('.link-chart6').on("click", function (e) {
            $('.cc-chart').addClass('open');
        });

        $('.link-starbucks').on("click", function (e) {
            e.preventDefault();
            // $('.site.sb').addClass('open');
            return false;
        });

        $('.link-kurly').on("click", function (e) {
            e.preventDefault();
            // $('.site.mk').addClass('open');
            return false;
        });

        $('.link-chi').on("click", function (e) {
            e.preventDefault();
            // $('.site.cc').addClass('open');
            return false;
        });

        $('.link-sb').on("click", function (e) {
            e.preventDefault();
            // $('.site.sh').addClass('open');
            return false;
        });

        //닫기
        $('.chart .back').on("click", function (e) {
            $('.chart').removeClass('open');
            $('.first-input').val('');
            $('.kb-hidden1, .kb-hidden2, .kb-hidden3, .kb-hidden4').hide();
            $('html, body, .scroll-views').animate({scrollTop: 0}, 0);
            $('.standby-txt').show();

            // $('.link-chart1').addClass('opend');

            $('.lists__item').each(function () {
                if ($(this).hasClass('is-expand')) {
                    $(this).removeClass('is-expand').addClass('long');
                    $(this).find('.lists__expand').hide().removeClass('is-actived');
                    $(this).find('.lists__summery, .lists__tits .ico').show();
                    $(this).find('.lists__in-content, .lists__mypick, .lists__mypick2').hide();
                }
            });

            $('.welcome-msg').show();
            $('.newchart-keypad').removeClass('is-showed');
        });

        $('.site .back').on("click", function (e) {
            $('.site').removeClass('open');

            $('.first-input').val('');
            $('.kb-hidden1, .kb-hidden2, .kb-hidden3, .kb-hidden4').hide();
            $('html, body, .scroll-views').animate({scrollTop: 0}, 0);
            $('.standby-txt').show();

            // $('.link-chart1').addClass('opend');

            $('.lists__item').each(function () {
                if ($(this).hasClass('is-expand')) {
                    $(this).removeClass('is-expand').addClass('long');
                    $(this).find('.lists__expand').hide().removeClass('is-actived');
                    $(this).find('.lists__summery, .lists__tits .ico').show();
                    $(this).find('.lists__in-content, .lists__mypick, .lists__mypick2').hide();
                }
            });

            $('.welcome-msg').show();
            $('.newchart-keypad').removeClass('is-showed');
        });

        $('.brandhome .back').on("click", function (e) {
            $('.mCSB_container').css('height', 'auto');
            $('.brandhome').removeClass('notransform open');

            $('.lists__item').each(function () {
                if ($(this).hasClass('is-expand')) {
                    $(this).removeClass('is-expand').addClass('long');
                    $(this).find('.lists__expand').hide().removeClass('is-actived');
                    $(this).find('.lists__summery, .lists__tits .ico').show();
                    $(this).find('.lists__in-content, .lists__mypick, .lists__mypick2').hide();
                }
            });

            $('.welcome-msg').show();
            $('.newchart-keypad').removeClass('is-showed');

            $('html, body, .scroll-views').animate({scrollTop: 0}, 0);
        });

        //scroll
        $('.chart .scroll-views').on("scroll", function () {
            $('.standby-txt').fadeOut();
        });

        $('html, body').on("scroll", function () {
            if ($(this).scrollTop() >= 54) {
                $('.header').addClass('scrolling');
            } else {
                $('.header').removeClass('scrolling');
            }
        }).trigger("scroll");
    };

    return {
        init: init
    }
})();

$(function () {
    RCSUI.init();

});
