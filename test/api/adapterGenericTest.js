'use strict';

const sinon = require('sinon');
const assert = require('assert');

const proxyquire = require('proxyquire');

const Adapter = require('../../api/adapter.js');
const AdapterFactory = require('../../api/adapterFactory.js');

const commonStubs = require('./commonStubs');

describe('adapter.open', function() {
    beforeEach(function() {
        this.bleDriver = commonStubs.createBleDriver();

        let adapterFactory = new AdapterFactory(this.bleDriver);
        adapterFactory.getAdapters((err, adapters) => {
            this.adapter = adapters.test;
        });
    });

    it('with valid options should open the underlaying driver', function() {
        let stateChangeCallback = sinon.spy();
        let checkIfCalledStub = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, (err) => {
            assert.ifError(err);
            sinon.assert.calledOnce(this.bleDriver.open);

            checkIfCalledStub();
        });

        sinon.assert.called(checkIfCalledStub);

        let args = this.bleDriver.open.lastCall.args;

        assert.equal(args[0], '6');
        assert.equal(args[1].baudRate, 115211);
        assert.equal(args[1].parity, 'none');
        assert.equal(args[1].flowControl, 'uhh');
        assert(args[1].logCallback !== undefined);
        assert(args[1].eventCallback !== undefined);

        sinon.assert.called(stateChangeCallback);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;

        assert.equal(stateCallbackArgs[0].address, 'Bridge of death');
        assert.equal(stateCallbackArgs[0].firmwareVersion, '0.0.9');
        assert.equal(stateCallbackArgs[0].name, 'holy handgrenade');
        assert.equal(stateCallbackArgs[0].available, true);
    });
});

describe('adapter.close', function() {
    beforeEach(function() {
        this.bleDriver = commonStubs.createBleDriver();

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        adapterFactory.getAdapters((err, adapters) => {
            assert.ifError(err);
            this.adapter = adapters.test;
        });
    });

    afterEach(function() {
    });

    it('should close the driver and emit adapterStateChanged event', function() {
        let checkIfCalledStub = sinon.spy();
        let stateChangeCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, (err) => {
            assert.ifError(err);

            this.adapter.close(function(err) {
                assert.ifError(err);
                checkIfCalledStub();
            });
        });

        // Not able to get this.adapter.close CB to be called before getting here, even if sinon stubs/spies are set up to be sync...
        //sinon.assert.called(checkIfCalledStub);

        // 1: UART settings, 2: opening driver, 3: adapter state (version, name, etc) 4: closing driver
        assert.equal(stateChangeCallback.callCount, 4);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;
        assert.equal(stateCallbackArgs[0].available, false);
    });

    it('should emit error when closing the driver yields an error', function() {
        let checkIfCalledStub = sinon.spy();
        let stateChangeCallback = sinon.spy();
        let errorCallback = sinon.spy();

        this.bleDriver.close.yields('ERROR!');

        this.adapter.on('adapterStateChanged', stateChangeCallback);
        this.adapter.on('error', errorCallback);

        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, (err) => {
            assert.ifError(err);

            this.adapter.close(function(err) {
                assert.equal(err, 'ERROR!');
                checkIfCalledStub();
            });
        });

        sinon.assert.calledOnce(checkIfCalledStub);

        // 1: UART settings, 2: opening driver, 3: adapter state (version, name, etc) 4: closing the driver
        sinon.assert.callCount(stateChangeCallback, 4);

        let stateCallbackArgs = stateChangeCallback.lastCall.args;
        assert.equal(stateCallbackArgs[0].available, false);
    });
});

describe('adapter.getAdapterState', function() {
    beforeEach(function() {
        this.bleDriver = commonStubs.createBleDriver();

        var adapterFactory = new AdapterFactory(this.bleDriver);
        adapterFactory.getAdapters((err, adapters) => {
            this.adapter = adapters.test;
        });
    });

    afterEach(function() {
    });

    it('should provide information from the driver and device', function() {
        let checkIfCalledStub = sinon.spy();

        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'yes please'}, (err) => {
        });

        this.adapter.getAdapterState(function(err, adapterState) {
            checkIfCalledStub();

            assert.equal(adapterState.baudRate, 115211);
            assert.equal(adapterState.parity, 'none');
            assert.equal(adapterState.flowControl, 'yes please');
            assert.equal(adapterState.address, 'Bridge of death');
            assert.equal(adapterState.firmwareVersion, '0.0.9');
            assert.equal(adapterState.name, 'holy handgrenade');
            assert.equal(adapterState.available, true);
            assert.equal(adapterState.port, '6');
            assert.equal(adapterState.available, true);
            assert.equal(adapterState.scanning, false);
            assert.equal(adapterState.advertising, false);
            assert.equal(adapterState.connecting, false);
        });

        sinon.assert.calledOnce(checkIfCalledStub);
    });

    it('should emit error if not able to provide information from the driver and device', function() {
        let checkIfCalledStub = sinon.spy();
        let errorCallback = sinon.spy();

        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'yes please'}, err => {
        });

        this.bleDriver.get_version.yields(undefined, 'ONE ERROR!');

        this.adapter.on('error', errorCallback);

        this.adapter.getAdapterState(function(err, adapterState) {
            checkIfCalledStub();
            assert.equal(err.description, 'ONE ERROR!');
        });

        sinon.assert.calledOnce(checkIfCalledStub);
        sinon.assert.calledOnce(errorCallback);
    });
});