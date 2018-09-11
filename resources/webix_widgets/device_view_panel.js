/**
 * @module DeviceViewPanel
 * @memberof ui
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 9/10/18
 */
(function(){
    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     */
    var device_panel_header = "<span class='webix_icon fa-microchip'></span> Device: ";

    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     */
    var device_info_values = [
        "name",
        "admin",
        "device_class",
        "exported",
        "host",
        "idl",
        "pid",
        "started_at",
        "stopped_at"
    ];

    /**
     * @memberof ui.DeviceViewPanel
     */
    var device_info_parser = function(device){
        if (device.id === undefined) return false;
        function get_device_info(device){
            var result = [];

            result.push({
                info: 'Alias',
                value: device.display_name
            });

            device_info_values.forEach(function(item){
                result.push({
                    info: MVC.String.classize(item),
                    value: device.info[item]
                })
            });

            return result;
        }

        var info = get_device_info(device);
        this.clearAll();
        this.parse(info);

        $$("device_tree").config.header = webix.template(function () {
            return device_panel_header + device.display_name;
        });
        $$("device_tree").refresh();
    };

    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     */
    var filter = function () {
        return {
            view: 'text',
            value: '',
            placeholder: 'type to filter',
            label: '<span class="webix_icon fa-filter"></span>',
            labelWidth: 20,
            on: {
                onTimedKeyPress: function () {
                    this.getFormView().$$("list").filter("#name#", this.getValue());
                }
            }
        }
    };

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.list.html webix.ui.list}
     * @namespace device_tree_list
     * @memberof ui.DeviceViewPanel
     */
    var device_tree_list = webix.protoUI(
        {
            name: 'device_tree_list',
            /**
             * @constructor
             * @param config
             * @memberof ui.DeviceViewPanel.device_tree_list
             */
            $init:function(config){
            },
            defaults: {
                select: true,
                drag: "source",
                template: function(obj){
                    return "<span class='webix_icon "+ obj.getIcon() + "'></span>"+ obj.display_name;
                },
                onContext:{},
                on: {
                    /**
                     *
                     * @param device
                     * @return {boolean}
                     * @memberof ui.DeviceViewPanel.device_tree_list
                     */
                    onBindApply: function (device) {
                        if (device.id === undefined) return false;
                        this.clearAll();
                        this.data.importData(device[this.config.$id]);
                        this.sort("#display_name#", "asc", "string");
                    },
                    /**
                     *
                     * @param id
                     * @memberof ui.DeviceViewPanel.device_tree_list
                     */
                    onAfterSelect: function (id) {
                        OpenAjax.hub.publish("tango_webapp.item_selected", {
                            data: {
                                id: id,
                                kind: this.config.$id
                            }
                        });
                    }
                }
            }
        }, webix.ui.list);

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.form.html webix.ui.layout}
     * @memberof ui.DeviceViewPanel
     * @namespace device_info_panel
     * @property {String} name
     */
    var device_info_panel = webix.protoUI({
        name: 'device_info_panel',
        _ui:function(){
            return {
                rows:[
                    TangoWebapp.ui.newInfoDatatable(device_info_parser),
                    {
                        view: "tabview",
                        gravity: 2,
                        cells: [
                            {
                                header: "Commands",
                                body: {
                                    rows:[
                                        filter(),
                                        {
                                            id:'commands',
                                            view:'device_tree_list'
                                        }
                                    ]
                                }
                            },
                            {
                                header: "Attributes",
                                body: {
                                    rows:[
                                        filter(),
                                        {
                                            id:'attrs',
                                            view:'device_tree_list'
                                        }
                                    ]
                                }
                            },
                            {
                                header: "Pipes",
                                body: {
                                    rows:[
                                        filter(),
                                        {
                                            id:'pipes',
                                            view:'device_tree_list'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        },
        /**
         * @constructor
         * @param config
         * @memberof ui.DeviceViewPanel.device_info_panel
         */
        $init:function(config){
            webix.extend(config, this._ui());
            this.$ready.push(function(){
                this.$$('info').bind(config.context.devices);
                this.$$('commands').bind(config.context.devices);
                this.$$('attrs').bind(config.context.devices);
                this.$$('pipes').bind(config.context.devices);
            }.bind(this));
        }
    }, webix.IdSpace, webix.ui.layout);

    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     */
    var attr_info_values = [
        'label','writable','data_format','data_type','max_dim_x','max_dim_y','unit','standard_unit',
        'display_unit','format','min_value','max_value'];

    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     * @namespace attr_info_datatable
     */
    var attr_info_datatable = {
        id: 'info',
        view: 'datatable',
        header:false,
        columns:[
            {id:'info' },
            {id:'value', fillspace: true}
        ],
        on:{
            /** Event listener
             * @function
             * @param attr
             * @memberof ui.DeviceViewPanel.attr_info_datatable
             */
            onBindApply:function(attr){
                if(!attr) return false;
                var info = [];
                info.push({info:'Name', value: attr.name});
                attr_info_values.forEach(function(el){
                    info.push({info:MVC.String.classize(el), value: attr.info[el]})
                });
                this.clearAll();
                this.parse(info);
            }
        }
    };
    /**
     * @constant
     * @memberof ui.DeviceViewPanel
     * @namespace commands_info_datatable
     */
    var commands_info_datatable = {
        view: 'form',
        id: 'info',
        elements:[{
            cols: [{
                view:'fieldset',
                label: 'Input',
                body:{
                    rows:[
                        {
                            view: 'label',
                            name:'in_type'
                        },
                        {
                            view: 'textarea',
                            name:'in_type_desc'
                        }
                    ]
                }
            },
                {
                    view:'fieldset',
                    label: 'Output',
                    body:{
                        rows:[
                            {
                                view: 'label',
                                name:'out_type'
                            },
                            {
                                view: 'textarea',
                                name:'out_type_desc'
                            }
                        ]
                    }
                }]
        }
        ],
        on:{
            /** Event listener
             * @function
             * @param {TangoCommand} cmd
             * @returns {boolean}
             * @memberof  ui.DeviceViewPanel.commands_info_datatable
             */
            onBindApply:function(cmd){
                if(!cmd) return false;
                this.setValues(cmd.info);
            }
        }
    };

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.form.html webix.ui.view}
     * @memberof ui.DeviceViewPanel
     * @namespace device_panel_empty
     * @property {String} name
     */
    var device_panel_empty = webix.protoUI({
        name:"device_panel_empty",
        $init:function(){
            // this.$ready.push(function(){
            //     this.showProgress({
            //         type: "icon"
            //     })
            // });
        }
    },  webix.ProgressBar, webix.ui.view);

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.form.html webix.ui.form}
     * @memberof ui.DeviceViewPanel
     * @namespace device_panel_commands
     * @property {TangoCommand} command
     * @property {String} name
     */
    var device_panel_commands = webix.protoUI(
        {
            command: null,
            name: 'device_panel_commands',
            _execute_command: function () {
                var command = this.command;

                var argin = this.elements.argin.getValue();

                UserAction.executeCommand(command, argin)
                    .then(function (resp) {
                        if (!resp.output) resp.output = "";
                        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_command_out.ejs'}).render(resp));
                    }.bind(this))
                    .fail(error_handler.bind(this));
            },
            _ui: function () {
                return {
                    elements: [
                        commands_info_datatable,
                        {
                            view: 'text',
                            name: 'argin',
                            placeholder: 'Input e.g. 3.14 or [3.14, 2.87] etc'
                            //TODO argin converter
                        },
                        {
                            view: 'button',
                            name: 'btnExecCmd',
                            value: 'Execute',
                            click: function () {
                                var form = this.getFormView();
                                if (form.validate()) {
                                    form._execute_command();
                                }
                            }
                        }
                    ]
                }
            },
            /**
             * @constructor
             * @memberof ui.DeviceViewPanel.device_panel_commands
             */
            $init: function (config) {
                webix.extend(config, this._ui());
                this.$ready.push(function () {
                    this.bind($$('device_info_panel').$$('commands'));
                }.bind(this));
            },
            defaults: {
                complexData: true,
                on: {
                    /**
                     * Event listener
                     * @memberof ui.DeviceViewPanel.device_panel_commands
                     */
                    onBindApply: function (command) {
                        if (!command) return;

                        this.clearValidation();

                        this.command = command;

                        if (command.info.in_type !== 'DevVoid') {
                            this.elements.argin.define({
                                validate: webix.rules.isNotEmpty,
                                invalidMessage: 'Input argument can not be empty'
                            });
                        } else {
                            this.elements.argin.define({validate: '', invalidMessage: 'Input argument can not be empty'});
                        }
                    }
                }
            }
        }, webix.ProgressBar, webix.IdSpace, webix.ui.form);

    /**
     * @function
     * @param view
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
        //TODO make instance functions
    var openTab = function (view, resp) {
            var $$tab = $$(this.id);
            if (!$$tab) {
                var device = PlatformContext.devices.getItem(this.device_id);
                PlatformApi.PlatformUIController().openTangoHostTab(device.host, view);

                $$tab = $$(this.id);
            }

            $$tab.show();
            $$tab.update(resp);
        };

    //TODO send Open Ajax event and handle it in main_controller
    /**
     * @function
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
    var openSpectrumWindow = function (resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-area-chart'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newSpectrumView(this)
        }, resp);
    };

    //TODO send Open Ajax event and handle it in main_controller
    /**
     * @function
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
    var openImageWindow = function (resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-image'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newImageView(webix.extend({id: this.id}, resp))
        }, resp);
    };
    /**
     * @function
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
    var openScalarWindow = function(resp) {
        var device = PlatformContext.devices.getItem(this.device_id);
        openTab.bind(this)({
            header: "<span class='webix_icon fa-at'></span>[<span class='webix_strong'>" + device.display_name + '/' + this.display_name + "</span>]",
            close: true,
            borderless: true,
            body: TangoWebapp.ui.newScalarView(webix.extend({id: this.id}, resp))
        }, resp)
    };
    /**
     * @function
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
    var attr_output_handler = function (resp) {
        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_attribute_out.ejs'}).render(resp));
    };
    /**
     * @function
     * @param resp
     * @memberof ui.DeviceViewPanel
     */
    var error_handler = function (resp) {
        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_error_out.ejs'}).render(resp));
        //clear errors
        resp.errors.length = 0;
    };

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.form.html webix.ui.form}
     * @memberof ui.DeviceViewPanel
     * @namespace device_panel_attributes
     * @property {TangoAttribute} attr -- set in TODO method link onBindApply
     * @property {String} name
     */
    var device_panel_attributes = webix.protoUI(
        {
            attr: null,
            name: 'device_panel_attributes',
            _read: function () {
                UserAction.readAttribute(this.attr)
                    .then(attr_output_handler.bind(this))
                    .fail(error_handler.bind(this));
            },
            _write: function () {
                var v = this.elements.w_value.getValue();

                UserAction.writeAttribute(this.attr, v)
                    .then(attr_output_handler.bind(this))
                    .fail(error_handler.bind(this));

            },
            _plot: function () {
                if (this.attr.info.data_format === "SPECTRUM") {
                    UserAction.readAttribute(this.attr)
                        .then(openSpectrumWindow.bind(this.attr))
                        .fail(error_handler.bind(this));
                } else if (this.attr.info.data_format === "IMAGE") {
                    UserAction.readAttribute(this.attr)
                        .then(openImageWindow.bind(this.attr))
                        .fail(error_handler.bind(this));
                } else if (this.attr.info.data_format === "SCALAR") {
                    UserAction.readAttribute(this.attr)
                        .then(openScalarWindow.bind(this.attr))
                        .fail(error_handler.bind(this));
                } else {
                    TangoWebappHelpers.error("Unsupported data format: " + this.attr.info.data_format);
                }
            },
            _plot_history:function(){
                UserAction.readAttributeHistory(this.attr)
                    .then(function(attr){
                        attr.value = attr.history.pop();
                        return attr;
                    })
                    .then(openScalarWindow.bind(this.attr))
                    .then(function(){
                        var $$plot = $$(this.attr.id);
                        $$plot.updateMulti(this.attr.history);
                    }.bind(this))
                    .fail(error_handler.bind(this));
            },
            _ui: function () {
                return {
                    elements: [
                        attr_info_datatable,
                        {
                            cols: [
                                {
                                    view: 'button',
                                    name: 'btnRead',
                                    value: 'Read',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._read();
                                        }
                                    }
                                },
                                {
                                    view: 'button',
                                    name: 'btnPlot',
                                    disabled: true,
                                    value: 'Plot',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._plot();
                                        }
                                    }
                                },
                                {
                                    view: 'button',
                                    name: 'btnPlotHist',
                                    disabled: true,
                                    value: 'Plot.Hist',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._plot_history();
                                        }
                                    }
                                }]
                        },
                        {
                            cols:[
                                {
                                    view: 'button',
                                    name: 'btnWrite',
                                    disabled: true,
                                    value: 'Write',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._write();
                                        }
                                    }
                                },{
                                    view: 'text',
                                    name: 'w_value',
                                    placeholder: 'attribute value',
                                    gravity:2
                                }
                            ]
                        }
                    ]
                }
            },
            /**
             * @constructor
             * @memberof ui.DeviceViewPanel.device_panel_attributes
             */
            $init: function (config) {
                webix.extend(config, this._ui());

                this.$ready.push(function () {
                    this.bind($$('device_info_panel').$$('attrs'));
                }.bind(this));
            },
            defaults: {
                on: {
                    /**
                     * Event listener
                     * @memberof ui.DeviceViewPanel.device_panel_attributes
                     */
                    onBindApply: function (obj, dummy, master) {
                        if (!obj) return this.clear();
                        this.attr = obj;
                        var info = [];
                        info.push({info:'Name', value: obj.name});
                        attr_info_values.forEach(function(el){
                            info.push({info:MVC.String.classize(el), value: obj.info[el]})
                        }.bind(this));
                        var $$info = this.$$('info');
                        $$info.clearAll();
                        $$info.parse(info);

                        this.elements['btnPlot'].enable();
                        if(obj.isScalar()){
                            this.elements['btnPlotHist'].enable();
                        }
                        if (obj.info.writable.includes("WRITE"))
                            this.elements['btnWrite'].enable();
                        else
                            this.elements['btnWrite'].disable();
                    }
                }
            }
        }, webix.ProgressBar, webix.IdSpace, webix.ui.form);

    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.form.html webix.ui.form}
     * @memberof ui.DeviceViewPanel
     * @namespace device_panel_pipes
     * @property {TangoPipe} pipe
     * @property {String} name
     */
    var device_panel_pipes = webix.protoUI(
        {
            pipe: null,
            name: 'device_panel_pipes',
            _read: function () {
                var pipe = this.pipe;

                UserAction.readPipe(pipe)
                    .then(function (resp) {
                        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                    }.bind(this))
                    .fail(error_handler.bind(this));

            },
            _write: function () {
                var pipe = this.pipe;

                var input;
                try {
                    input = JSON.parse(this.elements.input.getValue())
                } catch (e) {
                    TangoWebappHelpers.error(e);
                }

                UserAction.writePipe(pipe, input)
                    .then(function (resp) {
                        this.getTopParentView().$$('output').setValue(new View({url: 'views/dev_panel_pipe_out.ejs'}).render(resp));
                    }.bind(this))
                    .fail(error_handler.bind(this));
            },
            _ui: function () {
                return {
                    elements: [
                        {
                            view: 'text',
                            type: 'hidden',
                            height: 2,
                            name: 'name',
                            validate: webix.rules.isNotEmpty,
                            invalidMessage: 'Pipe must be selected from the list'
                        },
                        {
                            view: 'textarea',
                            name: 'input'
                            //TODO code highlight
                        },
                        {
                            cols: [
                                {
                                    view: 'button',
                                    name: 'btnRead',
                                    value: 'Read',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._read();
                                        }
                                    }
                                },
                                {
                                    view: 'button',
                                    name: 'btnWrite',
                                    value: 'Write',
                                    click: function () {
                                        var form = this.getFormView();
                                        if (form.validate()) {
                                            form._write();
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            /**
             * @constructor
             * @memberof ui.DeviceViewPanel.device_panel_pipes
             */
            $init: function (config) {
                webix.extend(config, this._ui());
                this.$ready.push(function () {
                    this.bind($$('device_info_panel').$$('pipes'));
                }.bind(this));
            },
            defaults:{
                on:{
                    /**
                     *
                     * @param pipe
                     * @memberof ui.DeviceViewPanel.device_panel_pipes
                     */
                    onBindApply:function(pipe){
                        if(!pipe) return;

                        this.pipe = pipe;
                    }
                }
            }
        }, webix.ProgressBar, webix.IdSpace, webix.ui.form);
    
    /**
     * Extends {@link https://docs.webix.com/api__refs__ui.layout.html webix.ui.layout}
     * @property {String} name
     * @memberof ui.DeviceViewPanel
     * @namespace device_control_panel
     */
    var device_control_panel = webix.protoUI(
        {
            name: 'device_control_panel',
            /**
             * @memberof ui.DeviceControlPanel.device_control_panel
             */
            clearAll: function () {
                //TODO
                this.$$('commands').clearAll();
                this.$$('attrs').clearAll();
                this.$$('pipes').clearAll();
            },
            _ui: function (context) {
                return {
                    rows: [
                        {
                            view: "multiview",
                            gravity: 3,
                            cells: [
                                {
                                    view: 'device_panel_empty'
                                },
                                {
                                    view: 'device_panel_commands',
                                    id: 'commands',
                                    context: context
                                },
                                {
                                    view: 'device_panel_attributes',
                                    id: 'attrs',
                                    context: context
                                },
                                {
                                    view: 'device_panel_pipes',
                                    id: 'pipes',
                                    context: context
                                }
                            ]
                        },
                        {view: "resizer"},
                        {
                            view: 'textarea',
                            id: 'output',
                            gravity: 2
                        }
                    ]
                };
            },
            _update_header:function(data){
                $$("device_control_panel_header").config.header = webix.template(function () {
                    switch(data.kind){
                        case "commands":
                            return "<span class='webix_icon fa-keyboard-o'></span> Command: " + TangoCommand.find_one(data.id).display_name;
                        case "attrs":
                            return "<span class='webix_icon fa-keyboard-o'></span> Attr: " + TangoAttribute.find_one(data.id).display_name;
                        case "pipes":
                            return "<span class='webix_icon fa-keyboard-o'></span> Pipe: " + TangoPipe.find_one(data.id).display_name;
                    }

                });
                $$("device_control_panel_header").refresh();
            },
            /**
             * @constructor
             * @memberof ui.DeviceViewPanel.device_control_panel
             */
            $init: function (config) {
                webix.extend(config, this._ui(config.context));

                this.$ready.push(function () {
                    // this.$$('device').bind(config.context.devices);
                }.bind(this));
            },
            defaults: {
                on: {
                    /**
                     * Event listener
                     * @memberof ui.DeviceViewPanel.device_control_panel
                     */
                    "tango_webapp.item_selected subscribe":function(event){
                        var self = event.controller;
                        self._update_header(event.data);
                        self.$$(event.data.kind).show(true);
                    },
                    "platform_api.ui.initialized subscribe": function (event) {
                        TangoWebappHelpers.debug('test_device_panel.platform_context.create subscribe');
                        // event.controller.$$('device').bind(event.data.context.devices);
                    },
                    "platform_context.destroy subscribe": function (event) {
                        TangoWebappHelpers.debug('test_device_panel.platform_context.destroy subscribe');
                        // event.controller.$$('device').unbind();
                    }
                }
            }
        }, TangoWebappPlatform.mixin.OpenAjaxListener, webix.IdSpace, webix.ui.layout);

    /**
     *
     * @param context
     * @return {{header: *|string, id: string, body: {context: *, view: string}}}
     * @memberof ui.DeviceViewPanel
     */
    TangoWebapp.ui.newDeviceInfoPanel = function(context){
        return {
            header: device_panel_header,
            id: 'device_tree',
            body: {
                context: context,
                id: 'device_info_panel',
                view: 'device_info_panel'
            }
        }
    };

    /**
     * @param context
     * @memberof ui.DeviceViewPanel
     */
    TangoWebapp.ui.newDeviceControlPanel = function (context) {
        return {
            header: "<span class='webix_icon fa-keyboard-o'></span> Device Control Panel",
            width: 300,
            id: 'device_control_panel_header',
            collapsed: true,
            body: {
                context: context,
                view: 'device_control_panel',
                id: 'device_control_panel'
            }
        };
    }

})();
