/*! priority-nav - v0.1.0 | (c) 2015 @gijsroge | MIT license |  */
/**
 *
 * Name v0.1.0
 * Priority+ pattern navigation that hides menu items based on the viewport width.
 *
 * Structure based on https://github.com/cferdinandi UMD boilerplate
 * Code inspired by http://codepen.io/lukejacksonn/pen/PwmwWV
 *
 * Free to use under the MIT License.
 * http://twitter.com/GijsRoge
 *
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define("priorityNav", factory(root));
    } else if (typeof exports === "object") {
        module.exports = factory(root);
    } else {
        root.priorityNav = factory(root);
    }
})(window || this, function (root) {

    "use strict";

    /**
     * Variables
     */
    var priorityNav = {}; // Object for public APIs
    var breaks = []; // Object to store instances with breakpoints where the instances menu item"s didin"t fit.
    var supports = !!document.querySelector && !!root.addEventListener; // Feature test
    var settings = {};
    var instance = 0;
    var count = 0;
    var navWrapper, totalWidth, restWidth, navMenu, navDropdown, navDropdownToggle, dropDownWidth, toggleWrapper;

    /**
     * Default settings
     * @type {{initClass: string, navDropdown: string, navDropdownToggle: string, navWrapper: string, itemToDropdown: Function, itemToNav: Function}}
     */
    var defaults = {
        initClass: "js-priorityNav",
        navWrapper: "nav",
        navMenu: "ul",
        navDropdown: ".nav__dropdown",
        navDropdownToggle: ".nav__dropdown-toggle",
        navDropdownLabel: "more",
        throttleDelay: 50,
        offsetPixels: 0,
        childrenCount: false,

        //Callbacks
        itemToDropdown: function () {
        },
        itemToNav: function () {
        }
    };


    /**
     * A simple forEach() implementation for Arrays, Objects and NodeLists
     * @private
     * @param {Array|Object|NodeList} collection Collection of items to iterate
     * @param {Function} callback Callback function for each iteration
     * @param {Array|Object|NodeList} scope Object/NodeList/Array that forEach is iterating over (aka `this`)
     */
    var forEach = function (collection, callback, scope) {
        if (Object.prototype.toString.call(collection) === "[object Object]") {
            for (var prop in collection) {
                if (Object.prototype.hasOwnProperty.call(collection, prop)) {
                    callback.call(scope, collection[prop], prop, collection);
                }
            }
        } else {
            for (var i = 0, len = collection.length; i < len; i++) {
                callback.call(scope, collection[i], i, collection);
            }
        }
    };


    /**
     * Get the closest matching element up the DOM tree
     * @param {Element} elem Starting element
     * @param {String} selector Selector to match against (class, ID, or data attribute)
     * @return {Boolean|Element} Returns false if not match found
     */
    var getClosest = function (elem, selector) {
        var firstChar = selector.charAt(0);
        for (; elem && elem !== document; elem = elem.parentNode) {
            if (firstChar === ".") {
                if (elem.classList.contains(selector.substr(1))) {
                    return elem;
                }
            } else if (firstChar === "#") {
                if (elem.id === selector.substr(1)) {
                    return elem;
                }
            } else if (firstChar === "[") {
                if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                    return elem;
                }
            }
        }
        return false;
    };


    /**
     * Merge defaults with user options
     * @private
     * @param {Object} defaults Default settings
     * @param {Object} options User options
     * @returns {Object} Merged values of defaults and options
     */
    var extend = function (defaults, options) {
        var extended = {};
        forEach(defaults, function (value, prop) {
            extended[prop] = defaults[prop];
        });
        forEach(options, function (value, prop) {
            extended[prop] = options[prop];
        });
        return extended;
    };


    /**
     * Debounced resize to throttle execution
     * @param func
     * @param wait
     * @param immediate
     * @returns {Function}
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }


    /**
     * Toggle class on element
     * @param el
     * @param className
     */
    var toggleClass = function (el, className) {
        if (el.classList) {
            el.classList.toggle(className);
        } else {
            var classes = el.className.split(" ");
            var existingIndex = classes.indexOf(className);

            if (existingIndex >= 0)
                classes.splice(existingIndex, 1); else
                classes.push(className);

            el.className = classes.join(" ");
        }
    };


    /**
     * Check if dropdown menu is already on page before creating it
     * @param navWrapper
     */
    var prepareHtml = function (_this) {
        if (!_this.querySelector(settings.navDropdown) && !_this.querySelector(settings.navDropdownToggle)) {
            /**
             * Create dropdow menu
             * @type {HTMLElement}
             */
            toggleWrapper = document.createElement("span");
            navDropdown = document.createElement("ul");
            navDropdownToggle = document.createElement("button");

            /**
             * Set label for dropdown toggle
             * @type {string}
             */
            navDropdownToggle.innerHTML = settings.navDropdownLabel;

            /**
             * Add classes so we can target elements
             */
            navDropdown.classList.add(settings.navDropdown.substr(1));
            navDropdownToggle.classList.add(settings.navDropdownToggle.substr(1));

            /**
             * Move elements to the right spot
             */
            _this.insertAfter(toggleWrapper, _this.querySelector(navMenu));
            toggleWrapper.style.position = "relative";
            toggleWrapper.appendChild(navDropdown);
            toggleWrapper.appendChild(navDropdownToggle);
            toggleWrapper.classList.add(settings.navDropdown.substr(1)+'-wrapper');
        }
    };


    /**
     * Get innerwidth without padding
     * @param element
     * @returns {number}
     */
    var getElementContentWidth = function(element) {
        var styles = window.getComputedStyle(element);
        var padding = parseFloat(styles.paddingLeft) +
            parseFloat(styles.paddingRight);

        return element.clientWidth - padding;
    };


    /**
     * Get width
     * @param elem
     * @returns {number}
     */
    var calculateWidths = function (_this) {
        totalWidth = getElementContentWidth(_this);
        //Check if parent is the navwrapper before calculating its width
        if (_this.querySelector(navDropdown).parentNode === _this) {
            dropDownWidth = _this.querySelector(navDropdown).offsetWidth;
        } else {
            dropDownWidth = 0;
        }
        restWidth = getChildrenWidth(_this) + settings.offsetPixels;
    };


    /**
     * Move item to array
     * @param item
     */
    priorityNav.doesItFit = function (instance, _this) {
        /**
         * Check if it is the first run
         */
        var delay = instance === 0 ? delay : settings.throttleDelay;
        instance++;

        /**
         * Debounced execution of the main logic
         */
        (debounce(function () {

            /**
             * Get the current element"s instance
             * @type {string}
             */
            var identifier = _this.getAttribute("instance");

            /**
             * Update width
             */
            calculateWidths(_this);

            /**
             * Keep executing until all menu items that are overflowing are moved
             */
            while (totalWidth < restWidth && _this.querySelector(navMenu).children.length > 0) {
                //move item to dropdown
                priorityNav.toDropdown(_this, identifier);
                //recalculate widths
                calculateWidths(_this, identifier);
            }

            /**
             * Keep executing until all menu items that are able to move back are moved
             */
            while (totalWidth > breaks[identifier][breaks[identifier].length - 1]) {
                //move item to menu
                priorityNav.toMenu(_this, identifier);
            }

            /**
             * If there are no items in dropdown hide dropdown
             */
            if (breaks[identifier].length < 1) {
                _this.querySelector(navDropdown).classList.remove("show");
            }

            /**
             * Check if we need to show toggle menu button
             */
            showToggle(_this, identifier);

        }, delay ))();
    };


    /**
     * Show/hide toggle button
     */
    var showToggle = function (_this, identifier) {
        if (breaks[identifier].length < 1) {
            _this.querySelector(navDropdownToggle).classList.add("is-hidden");
            _this.querySelector(navDropdownToggle).classList.remove("is-visible");
            _this.classList.remove("has-dropdown");
        } else {
            _this.querySelector(navDropdownToggle).classList.add("is-visible");
            _this.querySelector(navDropdownToggle).classList.remove("is-hidden");
            _this.classList.add("has-dropdown");
        }
    };


    /**
     * Update count on dropdown toggle button
     */
    var updateCount = function (_this, identifier) {
        _this.querySelector(navDropdownToggle).dataset.count = breaks[identifier].length;
    };


    /**
     * Move item to dropdown
     */
    priorityNav.toDropdown = function (_this, identifier) {


        /**
         * move last child of navigation menu to dropdown
         */
        if (_this.querySelector(navDropdown).firstChild && _this.querySelector(navMenu).children.length > 0) {
            _this.querySelector(navDropdown).insertBefore(_this.querySelector(navMenu).lastElementChild, _this.querySelector(navDropdown).firstChild);
        } else if (_this.querySelector(navMenu).children.length > 0) {
            _this.querySelector(navDropdown).appendChild(_this.querySelector(navMenu).lastElementChild);
        }

        /**
         * store breakpoints
         */
        breaks[identifier].push(restWidth);

        /**
         * check if we need to show toggle menu button
         */
        showToggle(_this, identifier);

        /**
         * update count on dropdown toggle button
         */
        if (_this.querySelector(navMenu).children.length > 0 && settings.childrenCount) {
            updateCount(_this, identifier);
        }

        /**
         * If item has been moved to dropdown trigger the callback
         */
        settings.itemToDropdown();
    };


    /**
     * Move item to menu
     */
    priorityNav.toMenu = function (_this, identifier) {

        /**
         * move last child of navigation menu to dropdown
         */
        if (_this.querySelector(navDropdown).children.length > 0) _this.querySelector(navMenu).appendChild(_this.querySelector(navDropdown).firstElementChild);

        /**
         * remove last breakpoint
         */
        breaks[identifier].pop();

        /**
         * Check if we need to show toggle menu button
         */
        showToggle(_this, identifier);

        /**
         * update count on dropdown toggle button
         */
        if (_this.querySelector(navMenu).children.length > 0 && settings.childrenCount) {
            updateCount(_this, identifier);
        }

        /**
         * If item has been moved back to the main menu trigger the callback
         */
        settings.itemToNav();
    };


    /**
     * Count width of children and return the value
     * @param e
     */
    var getChildrenWidth = function (e) {
        var children = e.childNodes;
        var sum = 0;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeType !== 3) {
                if(!isNaN(children[i].offsetWidth)){
                    sum += children[i].offsetWidth;
                }

            }
        }
        return sum;
    };


    /**
     * Bind eventlisteners
     */
    var listeners = function (_this) {

        // Check if an item needs to move
        if(window.attachEvent) {
            window.attachEvent("onresize", function() {
                if(priorityNav.doesItFit)priorityNav.doesItFit(instance, _this);
            });
        }
        else if(window.addEventListener) {
            window.addEventListener("resize", function() {
                if(priorityNav.doesItFit)priorityNav.doesItFit(instance, _this);
            }, true);
        }

        // Toggle dropdown
        _this.querySelector(navDropdownToggle).addEventListener("click", function () {
            toggleClass(_this.querySelector(settings.navDropdown), "show");
            toggleClass(this, "is-open");
            toggleClass(_this, "is-open");
        });

        /*
         * Remove when clicked outside dropdown
         */
        document.addEventListener("click", function (event) {
            if (!getClosest(event.target, settings.navDropdown) && event.target !== _this.querySelector(navDropdownToggle)) {
                _this.querySelector(navDropdown).classList.remove("show");
                _this.querySelector(navDropdownToggle).classList.remove("is-open");
                _this.classList.remove("is-open");
            }
        });

        /**
         * Remove when escape key is pressed
         */
        document.onkeydown = function (evt) {
            evt = evt || window.event;
            if (evt.keyCode === 27) {
                navDropdown.classList.remove("show");
                navDropdownToggle.classList.remove("is-open");
                navWrapper.classList.remove("is-open");
            }
        };
    };


    /**
     * Remove function
     */
    Element.prototype.remove = function() {
        this.parentElement.removeChild(this);
    }
    NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
        for(var i = 0, len = this.length; i < len; i++) {
            if(this[i] && this[i].parentElement) {
                this[i].parentElement.removeChild(this[i]);
            }
        }
    }


    /**
     * Destroy the current initialization.
     * @public
     */
    priorityNav.destroy = function (_this) {
        // If plugin isn"t already initialized, stop
        if (!settings) return;
        // Remove feedback class
        document.documentElement.classList.remove(settings.initClass);
        // Remove toggle
        toggleWrapper.remove();
        // Remove settings
        settings = null;
        delete priorityNav.init;
        delete priorityNav.doesItFit;
    };

    /**
     * insertAfter function
     * @param n
     * @param r
     */
    Node.prototype.insertAfter = function(n,r) {this.insertBefore(n,r.nextSibling);};


    /**
     * Initialize Plugin
     * @public
     * @param {Object} options User settings
     */
    priorityNav.init = function (options) {

        // Feature test.
        if (!supports){
            console.warn("This browser doesn't support priorityNav");
            return;
        }

        /**
         * Merge user options with defaults
         * @type {Object}
         */
        settings = extend(defaults, options || {});

        /**
         * Store nodes
         * @type {NodeList}
         */
        var elements = document.querySelectorAll(settings.navWrapper);

        /**
         * Loop over every instance and reference _this
         */
        forEach(elements, function(_this){

            /**
             * Create breaks array
             * @type {number}
             */
            breaks[count] = [];

            /**
             * Set the instance number as data attribute
             */
            _this.setAttribute("instance", count++);

            /**
             * Store the wrapper element
             */
            navWrapper = _this;
            if (!navWrapper) {
                console.warn("couldn't find the specified navWrapper element");
                return;
            }

            /**
             * Store the menu elementStore the menu element
             */
            navMenu = settings.navMenu;
            if (!_this.querySelector(navMenu)) {
                console.warn("couldn't find the specified navMenu element");
                return;
            }

            /**
             * Check if we need to create the dropdown elements
             */
            prepareHtml(_this);

            /**
             * Store the dropdown element
             */
            navDropdown = settings.navDropdown;
            if (!_this.querySelector(navDropdown)) {
                console.warn("couldn't find the specified navDropdown element");
                return;
            }

            /**
             * Store the dropdown toggle element
             */
            navDropdownToggle = settings.navDropdownToggle;
            if (!_this.querySelector(navDropdownToggle)) {
                console.warn("couldn't find the specified navDropdownToggle element");
                return;
            }

            /**
             * Event listeners
             */
            listeners(_this);

            /**
             * Start first check
             */
            priorityNav.doesItFit(instance, _this);

        });

        /**
         * Count amount of instances
         */
        instance++;

        /**
         * Add class to HTML element to activate conditional CSS
         */
        document.documentElement.classList.add(settings.initClass);
    };


    /**
     * Public APIs
     */
    return priorityNav;

});