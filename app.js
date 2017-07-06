/**
 * Created by KIA on 05.07.2017.
 */
var itemTpl = '<div class="view">\
    <input class="toggle" type="checkbox" <%= completed ? \'checked\': \'\' %>>\
    <label><%- title %></label>\
    <input class="edit" value="<%- title %>">\
    <button class="destroy">remove</button>\
    </div>';
var TodoView = Backbone.View.extend({
    tagName: 'li',
    template: _.template(itemTpl),
    events: {
        'dblclick label': 'editTodo',
        'blur .edit': 'saveTodo',
        'keypress .edit': 'updateOnEnter',
        'click .toggle': 'toggleCompleted',
        'click .destroy': 'destroy'
    },
    initialize: function () {
        this.model.on('change', this.render, this);
        this.model.on('destroy', this.remove, this); // remove - ф-ция Backbone
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.input = this.$('.edit');
        return this;
    },
    editTodo: function () {
        this.$el.addClass('editing');
        this.input.focus();
    },
    updateOnEnter: function (e) {
        if (e.which === 13) {
            this.saveTodo();
        }
    },
    saveTodo: function () {
        var value = this.input.val().trim();
        if (value) {
            this.model.save({title: value});
        }
        this.$el.removeClass('editing');
    },
    toggleCompleted: function() {
        this.model.toggle();
    },
    destroy: function() {
        this.model.destroy();
    }
});
// ToDo model
var Todo = Backbone.Model.extend({
    defaults: {
        title: '',
        completed: false
    },
    toggle: function() {
        this.save({completed: !this.get('completed')})
    }
});
// Todo list collection
var TodoList = Backbone.Collection.extend({
    model: Todo,
    localStorage: new Store("my-todo")
});
var todoList = new TodoList();
var AppView = Backbone.View.extend({
    el: '#todoapp',
    events: {
        'keypress #new-todo': 'newTodoKeypress'
    },
    initialize: function () {
        this.input = this.$('#new-todo');
        todoList.on('add', this.addTodo, this);
        todoList.on('reset', this.resetTodo, this);
        todoList.fetch(); // load from local store
    },
    newTodoKeypress: function (e) {
        if (e.which === 13 && this.input.val().trim()) {
            // создание модели
            todoList.create(this.getOptions());
            this.input.val('');
        }
    },
    addTodo: function (model) {
        var view = new TodoView({model: model});
        this.$('#todo-list').append(view.render().el)
    },
    resetTodo: function () {
        this.$('#todo-list').html('');
        todoList.each(this.addTodo, this);
    },
    getOptions: function () {
        return {
            title: this.input.val().trim(),
            completed: false
        };
    }
});
//var todo = new Todo({title: 'Hello world!'});
var appView = new AppView();




// image preview
function readUrl(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            $('#test').attr('src', e.target.result);
        };

        reader.readAsDataURL(input.files[0]);
    }
}