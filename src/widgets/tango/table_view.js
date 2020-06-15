import "views/tango/table_widget";

import {WaltzWidget} from "@waltz-controls/middleware";

import {kTangoRestContext, TangoAttribute, TangoCommand, TangoDevice} from "@waltz-controls/waltz-tango-rest-plugin";
import {kUserContext} from "@waltz-controls/waltz-user-context-plugin";
import {kChannelLog, kTopicLog} from "controllers/log";
import {
    ExecuteTangoCommand,
    kControllerUserAction,
    WriteTangoAttribute
} from "@waltz-controls/waltz-user-actions-plugin";
import {kControllerWebixMessage} from "controllers/message";
import {TangoId} from "@waltz-controls/tango-rest-client";

const kWidgetTableView = 'widget:table_view';
const kFrozenOverlayMessage = "<span class='webix_icon mdi mdi-bell-ring'></span>This TableWidget's configuration is" +
    " frozen...<br/> Please uncheck 'Frozen' box!";

class ContextEntity{
    constructor({id, name, alias, info}) {
        this.id = id;
        this.name = name;
        this.alias = alias;
        this.info = info;
    }
}

class Context{
    constructor() {
        this.devices = [];
        this.attributes = [];
        this.commands = [];
        this.frozen = false;
    }
}


function newProxy(target){
    return {
        $proxy: true,
        load: () => {
            return this.app.getContext(kUserContext).then(userContext => webix.extend(userContext.getOrDefault(this.id, new Context()), {commands: []})[target])
        },
        save: (master, params, dataProcessor) => {
            if(!dataProcessor.config.autoupdate) return;
            switch (params.operation) {
                case "insert":
                    return this.getUserContext()
                        .then(userContext => userContext.updateExt(this.id, ext => ext[target].push(new ContextEntity(params.data))))
                        .then(userContext => userContext.save())
                        .then(() => this.dispatch(`Successfully added new ${target} ${params.data.name}`,kTopicLog, kChannelLog));
                case "delete":
                    return this.getUserContext()
                        .then(userContext => userContext.updateExt(this.id, ext => {
                            const index = ext[target].findIndex(device => device.id === params.id)
                            ext[target].splice(index,1);
                        }))
                        .then(userContext => userContext.save())
                        .then(() => this.dispatch(`Successfully deleted ${target} ${params.data.name}`,kTopicLog, kChannelLog));
                default:
                    throw new Error(`Unsupported operation ${params.operation}`);
            }
        },
        saveAll: async (master, updates, dataProcessor)=>{
            if(dataProcessor.config.autoupdate) return;//skip in case autoupdate
            const deletes = updates.filter(update => update.operation === 'delete');

            const userContext = await this.getUserContext();
            const context = userContext.get(this.id)[target];

            deletes.forEach(update => {
                const index = context.findIndex(contextEntity => contextEntity.id === update.id);
                context.splice(index, 1);
            });

            return userContext.save()
                .then(() => this.dispatch(`Successfully updated user context!`,kTopicLog, kChannelLog))
        }
    }
}


export default class TableViewWidget extends WaltzWidget {
    constructor({id, app}) {
        super(id, app);
        this.frozen = false;

        const devices = newProxy.call(this, 'devices');

        const attributes = newProxy.call(this,'attributes');

        const commands = newProxy.call(this,'commands');

        this.devices = new webix.DataCollection({
            url: devices,
            save: devices
        });
        this.attributes = new webix.DataCollection({
            url: attributes,
            save: attributes
        });

        this.commands = new webix.DataCollection({
            url: commands,
            save: commands
        })

        this.restoreState();
    }

    get id(){
        return this.name;
    }

    ui(){
        return {
            view:"table_widget",
            id: this.id,
            root: this
        }
    }

    getTangoRest(){
        return this.app.getContext(kTangoRestContext);
    }

    getUserContext(){
        return this.app.getContext(kUserContext);
    }

    get $$view(){
        return $$(this.id);
    }

    get $$datatable(){
        return this.$$view.$$('datatable')
    }

    get $$settings(){
        return this.$$view.$$('settings')
    }

    setFrozen(v, update = false){
        this.frozen = v;
        this.$$settings.elements.frozen.setValue(v);
        if(update) {
            this.getUserContext()
                .then(userContext => userContext.updateExt(this.id, ext => ext.frozen = v))
                .then(userContext => userContext.save())
                .then(() => this.dispatch(`Successfully updated user context!`, kTopicLog, kChannelLog))
        }
    }

    clear(){
        if(this.frozen) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }
        this.$$datatable.clearAll();

        this.batchRemoveDevices();
    }

    batchRemoveDevices(){
        //batch delete devices from the context, invokes proxy.saveAll
        webix.dp(this.devices).define("autoupdate", false);
        try {
            const ids = [];

            this.devices.data.each(item => ids.push(item.id));
            this.devices.remove(ids);
            webix.dp(this.devices).send();
        } finally {
            webix.dp(this.devices).define("autoupdate", true);
        }
    }

    async restoreState(){
        const userContext = await this.getUserContext();
        if(!userContext.get(this.id)) return;
        const attributes = userContext.get(this.id).attributes
            .map(attr => new TangoAttribute(attr))
            .filter((v, i, a) => a.findIndex(item => item.name === v.name) === i);
        const commands = (userContext.get(this.id).commands === undefined ? [] : userContext.get(this.id).commands)
            .map(cmd => new TangoCommand(cmd))
            .filter((v, i, a) => a.findIndex(item => item.name === v.name) === i);
        const devices = userContext.get(this.id).devices;

        this.$$datatable.addColumns(attributes);
        commands.forEach(cmd => {
            this.$$datatable.addCommand(cmd);
        });
        this.$$settings.addAttributes(attributes);
        this.$$settings.addAttributes(commands);

        this.$$datatable.parse(devices.map(device => ({...device, device: device.alias || device.name})));

        this.$$view.run();

        this.setFrozen(userContext.get(this.id).frozen, true);
    }

    /**
     *
     * @param {TangoId} id
     */
    removeAttribute(id){
        if(this.frozen) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }
        this.$$datatable.removeAttribute(id.name);
        this.$$settings.removeAttribute(id.name);

        const tangoId = id.getTangoMemberId();

        //TODO refactor, see #254
        if(this.attributes.exists(tangoId))
            this.attributes.remove(tangoId);
        if(this.commands.exists(tangoId))
            this.commands.remove(tangoId);
    }

    /**
     *
     * @param {TangoId} id
     * @param force
     * @return {Promise<void>}
     */
    async addAttribute(id, force = false){
        if(this.attributes.exists(id.getTangoMemberId())){
            this.app.getController(kControllerWebixMessage).show("Already added", 'info');
            return;
        }
        const rest = await this.getTangoRest();

        const attr = await rest.newTangoAttribute(id).toTangoRestApiRequest().get().toPromise().then(resp => new TangoAttribute(resp));


        if(this.frozen && !force) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }
        if(!attr.isScalar()) {
            this.$$view.showOverlay("Only SCALAR attributes are supported by this widget!");
            return;
        }

        this.$$datatable.addAttribute(attr, force);
        this.$$settings.addAttribute(attr, force);

        this.attributes.add(attr);

        this.$$view.run();
    }

    /**
     *
     * @param {TangoId} id
     * @param value
     */
    async writeAttribute(id, value){
        const user = (await this.getUserContext()).user;
        const rest = await this.getTangoRest();

        const attribute = await rest.newTangoAttribute(id).toTangoRestApiRequest().get().toPromise().then(resp => new TangoAttribute(resp))
        return this.app.getController(kControllerUserAction).submit(
            new WriteTangoAttribute({user, attribute, value})
        );
    }

    /**
     *
     * @param {TangoId} id
     * @return {Promise<void>}
     */
    async addDevice(id){
        if(this.frozen) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }
        if(this.devices.exists(id.getTangoDeviceId())) return;

        const rest = await this.getTangoRest();

        const device = await rest.newTangoDevice(id).toTangoRestApiRequest().get('?filter=!info').toPromise().then(resp => new TangoDevice(resp));

        this.$$datatable.addDevice(device);
        this.$$settings.addDevice(device);

        this.devices.add(device);

        this.$$view.run();
    }

    /**
     *
     * @param {TangoId} id
     */
    removeDevice(id){
        if(this.frozen) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }
        this.$$datatable.removeDevice(id.getTangoDeviceId());
        this.devices.remove(id.getTangoDeviceId());
    }

    /**
     *
     * @param {TangoId} id
     */
    async addCommand(id, force = false){
        if(this.commands.exists(id.getTangoMemberId())){
            this.app.getController(kControllerWebixMessage).show("Already added", 'info');
            return;
        }
        if(this.frozen && !force) {
            this.$$view.showOverlay(kFrozenOverlayMessage);
            return;
        }

        const rest = await this.getTangoRest();

        const cmd = await rest.newTangoCommand(id).toTangoRestApiRequest().get().toPromise().then(resp => new TangoCommand(resp));

        if(!cmd.isVoid()) {
            this.$$view.showOverlay("Only void commands are supported by this widget!");
            return;
        }

        this.$$datatable.addCommand(cmd, force);
        this.$$settings.addCommand(cmd, force);

        this.commands.add(cmd);

        this.$$view.run();
    }

    executeAll(name){
        this.devices.data.each(device => {
            this.execute(TangoId.fromDeviceId(device.id).setName(name))
        })
    }

    /**
     *
     * @param {TangoId} id
     */
    async execute(id){
        const rest = await this.getTangoRest();
        const user = (await this.getUserContext()).user;
        const command = await rest.newTangoCommand(id).toTangoRestApiRequest().get().toPromise().then(resp => new TangoCommand(resp));

        this.app.getController(kControllerUserAction).submit(new ExecuteTangoCommand({user,command}))
    }
}