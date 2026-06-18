import { LightningElement, track } from 'lwc';

import initiateAuth from '@salesforce/apex/CustomMFAController.initiateAuth';

import completeAuth from '@salesforce/apex/CustomMFAController.completeAuth';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
 
export default class MfaPortal extends LightningElement {

     @track showLogin = true; @track showRegistration = false; @track showVerification = false;
    username; password; otp; qrCodeUrl; tempSecret; currentState;
 
    handleInput(e) {
        const n = e.target.name;
        if (n === 'user') this.username = e.target.value;
        if (n === 'pass') this.password = e.target.value;
        if (n === 'otp') this.otp = e.target.value;
    }
 
    async handleStepOne() {
        try {
            const res = await initiateAuth({ username: this.username, password: this.password });
            this.currentState = res.state;
            this.tempSecret = res.tempSecret;
            this.qrCodeUrl = res.qrCodeUrl;
            this.showLogin = false;
 
            if (this.currentState === 'VERIFY') {
                this.showVerification = true;
            } else {
                this.showRegistration = true;
            }
        } catch (e) { this.toast('Error', e.body.message, 'error'); }
    }
 
    async handleStepTwo() {
        const success = await completeAuth({ 
            state: this.currentState, username: this.username, 
            password: this.password, otp: this.otp, secret: this.tempSecret 
        });
 
        if (success) {
            this.toast('Welcome', 'Authentication Successful!', 'success');
            // Logic to redirect user
        } else {
            this.toast('Error', 'Invalid Code. Please try again.', 'error');
        }
    }
 
    toast(t, m, v) { this.dispatchEvent(new ShowToastEvent({title: t, message: m, variant: v})); }

}