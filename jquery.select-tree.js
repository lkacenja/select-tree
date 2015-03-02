;(function($) {
  $.fn.st = function(options) {
    return this.each(function() {
      var $el = $(this);
      if ($el.data('st-opts'))
        return; // already initialized
      var data = $el.data('st-data');
      if (!data && options && options.data)
        data = options.data
      if (!data) {
        $.fn.st.log('Required data is missing. A tree of key values may be passed via options.data or by setting data-st-data on element.')
        return;
      }
      if (typeof data == 'string') {
        data = $.parseJSON(data);
      }
      var opts = $.extend({}, $.fn.st.defaults, options || {}); 
      opts.data = data;
      opts.API = $.extend ({_$el: $el}, $.fn.st.API );
      opts.API.log = $.fn.st.log;
      opts.API.trigger = function(eventName, args) {
         opts.API._$el.trigger(eventName, args);
         return opts.API;
      };
      opts.factory = $.extend({}, $.fn.st.factory);
      // Attach opts to el
      $el.data('st-opts', opts);
      opts.API.init();
    });
  }
  $.fn.st.API = {
    opts: function() {
      return this._$el.data('st-opts');
    },
    init: function() {
      var opts = this.opts(),
      // Build and attach wrapper
      $wrapper = this._$wrapper = opts.factory.wrapper();
      this._$el.before($wrapper);
      // Kick of list recursion
      var $list = opts.API.buildList(opts.data); 
      $wrapper.append($list);
      // Store selection count
      opts.selectionCount = 0;
    },
    buildList: function(data, recurse) {
      var x,
      _this = this,
      opts = this.opts(),
      $parentList = opts.factory.list(); 
      opts.elementLookup = opts.elementLookup || {};
      for (x in data) {
        var $item = opts.factory.item();
        $item.find('.st-label').text(data[x].value); 
        $item.data('st-val', data[x].key);
        // Attach clicks
        function click(e) {
          opts.API.click.call(_this, e);
        }
        $item.find('.st-control').click(click);
        opts.elementLookup[data[x].key] = $item;
        if (data[x].children) {
          $item.addClass('st-parent');
          var $childList = opts.API.buildList(data[x].children, true);
          $item.append($childList);
        }
        if (recurse)
          $parentList.hide();
        $parentList.append($item);
      }
      return $parentList;
    },
    getItemByKey: function(key) {
      var opts = this.opts();
      if (opts.elementLookup[key]) {
        return opts.elementLookup[key];
      }
      return false;
    },
    getChildListByKey: function(key) {
      var opts = this.opts(),
      $item = opts.API.getItemByKey(key);
      if ($item && $item.length > 0) {
        return $item.find('ul').first();
      }
      return false;
    },
    getTarget: function($target) {
      var opts = this.opts();
      if (typeof $target == 'number' || typeof $target == 'string') {
        $target = opts.API.getChildListByKey($target);
      }
      if ($target.not('.st-item')) {
        $target = $target.parents('.st-item').first();
      }
      return $target;
    },
    click: function(e) {
      var opts = this.opts(),
        $target = $(e.target);
      if ($target.hasClass('st-label')) {
        var $item = $target.siblings('ul'),
        $parent = $target.parents('.st-item').first();
        $parent.toggleClass('st-open');
        opts.API.toggle($item);
      }
      if ($target.hasClass('st-add')) {
        opts.API.add($target);
      }
      if ($target.hasClass('st-remove')) {
        opts.API.remove($target);
      }
    },
    toggle: function($item) {
      var opts = this.opts();
      if ($item.is(':hidden')) {
        opts.API.open($item);
      }
      else {
        opts.API.close($item);
      }
    },
    open: function($target) {
      var opts = this.opts();
      if (typeof $target == 'number')
        $target = opts.API.getChildListByKey($target);
      $target.show(); 
      opts.API.trigger('st-open', [opts, opts.API, $target]);
    },
    close: function($target) {
      var opts = this.opts();
      if (typeof $target == 'number')
        $target = opts.API.getChildListByKey($target);
      $target.hide();
      opts.API.trigger('st-close', [opts, opts.API, $target]);
    },
    add: function($target) {
      var opts = this.opts();
      $target = opts.API.getTarget($target);
      opts.API.addValue($target);
      opts.API.trigger('st-add', [opts, opts.API, $target]);
    },
    remove: function($target) {
      var opts = this.opts();
      $target = opts.API.getTarget($target);
      opts.API.removeValue($target);
      opts.API.trigger('st-remove', [opts, opts.API, $target]);
    },
    addValue: function($item) {
      var opts = this.opts(),
      values = this._$el.val();
      values = values ? values.split(', ') : [];
      if (opts.forceRelationship == false) {
        addValue($item.data('st-val'), values);
        $item.addClass('st-added');
      }
      else {
        var $parents = $item.parentsUntil('.st-wrapper', '.st-item');
        $parents.each(function() {
          addValue($(this).data('st-val'), values);
          $(this).addClass('st-added');
        });
        addValue($item.data('st-val'), values);
        $item.addClass('st-added');
      }
      this._$el.val(values.join(', '));
    },
    removeValue: function($item) {
      var opts = this.opts(),
      values = this._$el.val();
      values = values ? values.split(', ') : [];
      if (opts.forceRelationship == false) {
        removeValue($item.data('st-val'), values); 
        $item.removeClass('st-added');
      }
      else {
        var $children = $item.find('.st-item');
        $children.each(function() {
          removeValue($(this).data('st-val'), values);
          $(this).removeClass('st-added');
        });
        removeValue($item.data('st-val'), values); 
        $item.removeClass('st-added');
      }
      this._$el.val(values.join(', '));
    }
  }
  
  function addValue(value, values) {
    var x;
    for (x in values) {
      if (values[x] == value) 
        return;
    }
    values.push(value);
  }

  function removeValue(value, values) {
    var x;
    for (x in values) {
      if (values[x] == value) {  
        values.splice(x, 1);
        return;
      }
    }
  }

  $.fn.st.defaults = {
    forceRelationship: true
  }

  $.fn.st.factory = {
    wrapper: function() {
      return $('<div/>').addClass('st-wrapper');
    },
    list: function() {
      return $('<ul/>').addClass('st-list');
    },
    item: function() {
      var $pick = this.control(),
        $close = this.control(),
        $label = this.control();
      $pick.text('+').addClass('st-add');
      $close.text('x').addClass('st-remove'); 
      $label.addClass('st-label');
      $item = $('<li/>');
      $item.addClass('st-item').append($label).append($pick).append($close);
      return $item;
    },
    control: function() {
      return $('<div/>').addClass('st-control');
    }
  }

  $.fn.st.log = function log() {
    if (window.console && console.log)
        console.log('[select tree] ' + Array.prototype.join.call(arguments, ' ') );
  }

})(jQuery);
;(function($) {
  var st = $.fn.st;
  $.fn.st = function(options) {
    var cmd, cmdFn, opts,
    publicFunctions = ['open', 'close', 'add', 'remove'];
    var args = $.makeArray(arguments);
    if ($.type(options) == 'string') {
      return this.each(function() {
        opts = $(this).data('st-opts');
        if (opts === undefined) {
          st.log("must be initialized before sending commands.");
          return;
        }
        cmd = options;
        cmdFn = opts.API[cmd];
        if ($.isFunction(cmdFn) && publicFunctions.indexOf(cmd) >= 0) {
          cmdArgs = $.makeArray(args);
          cmdArgs.shift();
          return cmdFn.apply(opts.API, cmdArgs);
        }
        else {
          st.log('unknown or protected command: ', cmd, ' Available commands are open, close, add, remove');
        }
      });
    }
    else {
      st.call(this, options);
    }
    return this;
  }
  $.extend($.fn.st, st);
})(jQuery);
