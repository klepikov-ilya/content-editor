// Модель для фигуры
var Shape = Backbone.Model.extend({
    defaults: {
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        src: '',
        keepRatio: false
    },
    initialize: function () {
        if (this.get('keepRatio')) {
            var size = this.getStyles();
            this.set('ratio', size.width / size.height);
        }
    },
    // вернем у вдобном формате положение и размеры фигуры
    getStyles: function () {
        var size = this.toJSON();
        return {
            'top': size.top,
            'left': size.left,
            'height': size.bottom - size.top,
            'width': size.right - size.left
        };
    }
});

var shapeTemplate = '<div class="shape-view"><img <%= src ? [\'src="\', src, \'"\'].join(""): \'\' %> alt="image"/></div>' +
    '<div class="shape-view__resizer top-left" point="top-left"></div>' +
    '<div class="shape-view__resizer top-right" point="top-right"></div>' +
    '<div class="shape-view__resizer bottom-left" point="bottom-left"></div>' +
    '<div class="shape-view__resizer bottom-right" point="bottom-right"></div>';

var ShapeView = Backbone.View.extend({
    tagName: 'div',
    attributes: {
        class: 'shape'
    },
    template: _.template(shapeTemplate),
    events: {
        'mousedown .shape-view': 'startDragShape',
        'mousedown .shape-view__resizer': 'startDragResizer',
        'dragstart': 'preventDrag'
    },
    isDragging: false,
    isResizing: true,
    resizePoint: '',// тип текущей точки ресайза, чтоб определять, какие координаты изменять
    initialize: function () {
        this.listenTo(this.model, 'change', this.updateSize);
        this.listenTo(this.model, 'destroy', this.remove);
    },
    preventDrag: function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    },
    // shape D'n'D
    startDragShape: function (e) {
        this.isDragging = true;
        this.$el.toggleClass('dragging', this.isDragging);
        this.shift = {
            x: e.pageX - this.model.get('left'),
            y: e.pageY - this.model.get('top')
        };
        $(document).on('mousemove.drag', 'body', this.dragShape.bind(this));
        $(document).on('mouseup.drag', 'body', this.stopDragShape.bind(this));
    },
    dragShape: function (e) {
        if (!this.isDragging) {
            return;
        }
        var modelSize = this.model.toJSON(),
            size = {};
        // чтобы не испортить размеры объекта при драге вверх влево
        if (e.pageX - this.shift.x >= 0) {
            size['left'] = e.pageX - this.shift.x;
            size['right'] = e.pageX - this.shift.x + modelSize.right - modelSize.left;
        }
        if (e.pageY - this.shift.y >= 0) {
            size['top'] = e.pageY - this.shift.y;
            size['bottom'] = e.pageY - this.shift.y + modelSize.bottom - modelSize.top;
        }
        this.model.set(size);
    },
    stopDragShape: function (e) {
        this.isDragging = false;
        this.$el.toggleClass('dragging', this.isDragging);
        $(document).off('.drag');
    },
    // resizer D'n'D
    startDragResizer: function (e) {
        var rType = $(e.target).attr('point');
        this.isResizing = true;
        this.resizePoint = rType;
        $(document).on('mousemove.drag', 'body', this.dragResizer.bind(this));
        $(document).on('mouseup.drag', 'body', this.stopDragResizer.bind(this));
    },
    dragResizer: function (e) {
        var $area = $('.edit-area'),
            areaOffset = $area.offset(),
            pointObj = {
                x: e.pageX - areaOffset.left + $area.scrollLeft(),
                y: e.pageY - areaOffset.top + $area.scrollTop()
            };
        // prevent height overflow on resize
        pointObj.x = Math.max(0, pointObj.x);
        pointObj.y = Math.max(0, pointObj.y);
        if (this.resizePoint) {
            var resizeType = this.resizePoint.split('-'),
                options = {};
            options[resizeType[0]] = pointObj.y;
            options[resizeType[1]] = pointObj.x;
            // проверка корректности координат при ресайзе
            switch (resizeType[0]) {
                case 'top':
                    options['top'] = Math.min(this.model.get('bottom'), options['top']);
                    break;
                case 'bottom':
                    options['bottom'] = Math.max(this.model.get('top'), options['bottom']);
                    break;
            }
            switch (resizeType[1]) {
                case 'left':
                    options['left'] = Math.min(options['left'], this.model.get('right'));
                    break;
                case 'right':
                    options['right'] = Math.max(this.model.get('left'), options['right']);
                    break;
            }
            if (this.model.get('keepRatio')) {
                // при изменении ширины пропорционально меняем высоту
                // h = w / ratio
                var w = resizeType[1] === 'left' ? this.model.get('right') - options['left'] : options['right'] - this.model.get('left'),
                    h = Math.round(w / this.model.get('ratio'));
                options['bottom'] = (resizeType[0] === 'top' ? options['top'] : this.model.get('top')) + h;
            }
            this.model.set(options);
        }
    },
    stopDragResizer: function () {
        this.isResizing = false;
        this.resizePoint = null;
        $(document).off('.drag');
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.updateSize();
        return this;
    },
    updateSize: function () {
        var size = this.model.getStyles();
        this.$el.css(size);
        return this;
    }
});

var AppModel = Backbone.Model.extend({
    defaults: {
        minHeight: 0
    }
});
// основное приложение
var AppView = Backbone.View.extend({
    el: '.main-view',
    events: {
        'click .add-test': 'addRectangle',
        'click .main-view__add-image__btn': 'addImage',
        'click .main-view__add-video__btn': 'addVideo',
        'change .upload-image': 'imageLoad'
    },
    initialize: function () {
        this.$editArea = this.$('.edit-area__inner');
        this.shapes = [];
        this.model = new AppModel();
        this.listenTo(this.model, 'change', this.updateHeight);
    },
    // обновление min-height области при изменении значения в модели
    updateHeight: function (model) {
        this.$editArea.css('minHeight', model.get('minHeight'));
    },
    /**
     * Добавление фигуры в область редактирования
     **/
    addShape: function (opts) {
        // вычислить самый нижний элемент
        var bottomMost = this.shapes.reduce(function (prev, sh) {
            return Math.max(prev, sh.get('bottom'));
        }, 0);
        var shape = new Shape({
         top: bottomMost,
         bottom: bottomMost + (opts['height'] || (Math.round(Math.random() * 100) + 10)),
         left: 0,
         right: (0 + opts['width'] || 0) || 100,
         src: opts['src'] || '',
         keepRatio: opts['keepRatio'] || false
         });
        this.shapes.push(shape); // сохраним модель себе
        this.listenTo(shape, 'change', this.shapeChange);
        this.addShapeView(shape);
    },
    addShapeView: function (shape) {
        var view = new ShapeView({model: shape});
        this.$editArea.append(view.render().el);
    },
    addRectangle: function () {
        this.addShape({src: 'https://www.google.ru/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'});
    },
    // proxy click from button to input[file]
    addImage: function () {
        this.$('.upload-image').click();
    },
    // получаем превью картинки и ее размеры
    imageLoad: function (e) {
        var input = e.target,
            result = {},
            self = this;
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () {
                    result.width = this.width;
                    result.height = this.height;
                    result.keepRatio = true;
                    self.addShape(result);
                };
                img.src = result.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },
    addVideo: function () {
        var link = prompt('Insert video link'),
            result = { width: 500, height: 350};
        if (link !== null) {
            var id = this.getYouTubeId(link);
            if (id !== 'error') {
                result.src = ['https://img.youtube.com/vi/', id, '/maxresdefault.jpg'].join('');
                this.addShape(result)
            }
        }
    },
    // на изменение коллекции фигур обновим свой min-height
    shapeChange: function (model) {
        if ('bottom' in model.changed) {
            this.model.set('minHeight', Math.max(this.model.get('minHeight'), model.get('bottom')));
        }
    },
    //youtube id generate
    getYouTubeId: function (url) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);

        if (match && match[2].length == 11) {
            return match[2];
        } else {
            return 'error';
        }
    }
});
// создаем приложение
var appView = new AppView();