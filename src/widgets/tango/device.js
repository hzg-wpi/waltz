import "views/tango/device_controls";
import "views/tango/device_view_panel";

import {WaltzWidget} from "@waltz-controls/middleware";
import {kMainWindow} from "widgets/main_window";
import {kActionSelectTangoAttribute, kActionSelectTangoDevice} from "widgets/tango/actions";
import {
    kChannelTango,
    kTangoRestContext,
    TangoAttribute,
    TangoCommand,
    TangoPipe
} from "@waltz-controls/waltz-tango-rest-plugin";

import {forkJoin, of, throwError, timer} from "rxjs";
import {catchError, retryWhen, switchMap, tap} from "rxjs/operators";
import {kChannelLog, kTopicLog} from "controllers/log";
import {
    ExecuteTangoCommand,
    kControllerUserAction,
    ReadTangoAttribute,
    ReadTangoPipe,
    WriteTangoAttribute
} from "@waltz-controls/waltz-user-actions-plugin";
import {kUserContext} from "@waltz-controls/waltz-user-context-plugin";
import PipeWidget from "widgets/tango/pipe";
import CommandWidget from "widgets/tango/command";
import AttributeWidget from "widgets/tango/attribute";
import {fromArray} from "rxjs/internal/observable/fromArray";

export const kTangoDeviceWidget = 'widget:tango_device';

function getHeader(name = ''){
    return webix.template(`<span class='webix_icon mdi mdi-developer-board'></span> ${name}`)
}

function setHeader(name, target) {
    target.config.header = target.config.headerAlt = getHeader(name);
    target.refresh()
}


function catchFetchMembersError(members){
    return catchError(err => {
        this.dispatchError(`Failed to get ${members} for device ${this.deviceId}`, kTopicLog, kChannelLog);
        return of([]);
    });
}

/**
 * Should retry when errors stack does not contain CANNOT_IMPORT_DEVICE or DEVICE_NOT_EXPORTED or Api_NOT_SUPPORTED
 *
 * @param error
 * @return {boolean}
 */
function shouldRetry(error){
    if(error.errors && error.errors.length)
        return error.errors.find(err => err.reason && (
            err.reason.includes("CANNOT_IMPORT_DEVICE") ||
            err.reason.includes("DEVICE_NOT_EXPORTED") ||
            err.reason.includes("Api_NOT_SUPPORTED"))) === undefined
    else return false;
}

export default class TangoDeviceWidget extends WaltzWidget {
    constructor(app) {
        super(kTangoDeviceWidget, app);

        this.listen(id => this.setDevice(id),kActionSelectTangoDevice)
        this.listen(id => this.readAttribute(this.attributes.getItem(id.getTangoMemberId())), kActionSelectTangoAttribute)
        this.listen(action => {
            if(!action.attribute.isImage())
                    this.attributes.updateItem(action.attribute.id, {...action.data})
        },ReadTangoAttribute.action, kChannelTango)
        // this.listen(id => this.setDevice(id),kActionSelectTangoCommand)
        // this.listen(id => this.setDevice(id),kActionSelectTangoPipe)
    }

    ui() {
        return {
            view: 'accordionitem',
            header: getHeader(),
            headerHeight:32,
            headerAlt:getHeader(),
            headerAltHeight: 32,
            body: {
                id: this.name,
                view: "device_view_panel",
                root: this
            }
        }
    }

    get widget(){
        return $$(kTangoDeviceWidget);
    }

    get tab(){
        return $$(kTangoDeviceWidget).getParentView();
    }

    get attributes(){
        return $$(kTangoDeviceWidget).$$("attrs")
    }

    get commands(){
        return $$(kTangoDeviceWidget).$$("commands")
    }

    get pipes(){
        return $$(kTangoDeviceWidget).$$("pipes")
    }

    clearAll(){
        this.attributes.clearAll();
        this.commands.clearAll();
        this.pipes.clearAll();

        $$(kTangoDeviceWidget).$$('device_control_attribute').reset();
        $$(kTangoDeviceWidget).$$('device_control_command').reset();
        $$(kTangoDeviceWidget).$$('device_control_pipe').reset();
    }

    async refresh(){
        if(!this.deviceId) return;
        this.widget.showProgress();
        this.clearAll();
        const rest = await this.app.getContext(kTangoRestContext);
        forkJoin(
            [rest.newTangoDevice(this.deviceId)
                .toTangoRestApiRequest()
                .get("?filter=name&filter=alias&filter=exported").pipe(
                    catchError(err => {
                        this.dispatchError(err, kTopicLog, kChannelLog);
                        return of({info:{exported: false}});
                    })
            ),
                rest.newTangoDevice(this.deviceId)
                    .attributes()
                    .get().pipe(//"?filter=id&filter=name&filter=data_format&filter=data_type&filter=writable&filter=min_value&filter=max_value"
                    retryWhen(errors =>
                        errors.pipe(
                            tap(err => console.debug(`Failed to load device ${this.deviceId} attributes! ${err}`)),
                            switchMap(err => shouldRetry(err) ? timer(10): throwError(err))
                        )
                    ),
                    catchFetchMembersError.call(this, 'attributes')
            ),
                rest.newTangoDevice(this.deviceId)
                    .commands()
                    .get().pipe(//"?filter=id&filter=name&filter=in_type"
                    retryWhen(errors =>
                        errors.pipe(
                            tap(err => console.debug(`Failed to load device ${this.deviceId} commands! ${err}`)),
                            switchMap(err => shouldRetry(err) ? timer(10): throwError(err))
                        )
                    ),
                    catchFetchMembersError.call(this, 'commands')
            ),
                rest.newTangoDevice(this.deviceId)
                    .pipes()
                    .get().pipe(//"?filter=id&filter=name"
                    retryWhen(errors =>
                        errors.pipe(
                            tap(err => console.debug(`Failed to load device ${this.deviceId} pipes! ${err}`)),
                            switchMap(err => shouldRetry(err) ? timer(10): throwError(err))
                        )
                    ),
                    catchFetchMembersError.call(this, 'pipes')
            )]
        ).subscribe(([device, attributes, commands, pipes]) => {
            setHeader(device.alias || device.name, this.tab);
            if(device.info.exported){
                this.widget.enable();
            } else {
                this.widget.disable();
                return;
            }
            this.attributes.parse(attributes.map(attr => new TangoAttribute(
                {
                    ...attr
                })));
            this.attributes.sort("#name#");

            this.commands.parse(commands.map(cmd => new TangoCommand(
                {
                    ...cmd
                })));
            this.commands.sort("#name#");

            this.pipes.parse(pipes.map(pipe => new TangoPipe({...pipe})));
            this.pipes.sort("#name#");

            this.widget.hideProgress()
        });
    }

    /**
     *
     * @param {TangoId} id
     */
    setDevice(id){
        if(this.deviceId && (this.deviceId.getTangoDeviceId() === id.getTangoDeviceId())) return;
        this.deviceId = id;
        this.refresh();
    }

    run(){
        this.app.getWidget(kMainWindow).leftPanel.addView(this.ui());
        this.tab.collapse();
    }

    open(){
        this.tab.expand();
    }

    /**
     *
     * @param {TangoAttribute} attribute
     */
    async readAttribute(attribute){
        const user = (await this.app.getContext(kUserContext)).user;
        return this.app.getController(kControllerUserAction).submit(new ReadTangoAttribute({user, attribute}));
    }

    async readAttributeHistory(attribute){
        if(!attribute.isScalar()) throw new Error(`TangoAttribute of format ${attribute.info.data_format} does not support reading history!`);
        const rest = await this.app.getContext(kTangoRestContext);

        return rest.newTangoAttribute(attribute.tango_id).history()
            .toPromise()
            .catch(err => {
                this.dispatchError(err)
                throw err;
            });
    }

    async executeCommand(command, value){
        const user = (await this.app.getContext(kUserContext)).user;
        return this.app.getController(kControllerUserAction).submit(new ExecuteTangoCommand({user, command, value}));
    }

    async writeAttribute(attribute, value){
        const user = (await this.app.getContext(kUserContext)).user;
        return this.app.getController(kControllerUserAction).submit(new WriteTangoAttribute({user, attribute, value}));
    }

    /**
     *
     * @param {TangoAttribute} attr
     */
    openAttributeWindow(attr){
        return new AttributeWidget(this.app, attr)//TODO memory leak?
            .run();
    }

    /**
     *
     * @param {TangoCommand} cmd
     * @return {CommandWidget}
     */
    openCommandWindow(cmd) {
        return new CommandWidget(this.app, cmd)//TODO memory leak?
            .run();
    }

    /**
     *
     * @param {TangoPipe} pipe
     * @return {PipeWidget}
     */
    openPipeWindow(pipe){
        return new PipeWidget(this.app, pipe)//TODO memory leak?
            .run();
    }

    async readPipe(pipe){

        const user = (await this.app.getContext(kUserContext)).user;
        this.app.getController(kControllerUserAction)
            .submit(new ReadTangoPipe({user, pipe}))
            .then(result => {
                this.openPipeWindow(Object.assign(pipe, result))
                    .update(result);
            });
    }
}