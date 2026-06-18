import { LightningElement, track } from 'lwc';

// Importing our Apex methods
import getPortalUserDisplayName from '@salesforce/apex/CredentialDashboardController.getPortalUserDisplayName';

import handlePortalEntry from '@salesforce/apex/MfaPortalController.handlePortalEntry';

import finalizePortalAccess from '@salesforce/apex/MfaPortalController.finalizePortalAccess';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
 
export default class MfaPortal extends LightningElement {

    // 1. UI State Tracking

    @track showLogin = true; 

    @track showRegistration = false; 

    @track showVerification = false;

    @track showResetPassword = false;

    @track showDashboard = false;
 
    // 2. Data Tracking

    username = '';

    portalUserName;

    password = '';

    otp = '';

    qrCodeUrl = '';

    tempSecret = '';

    currentState = '';

    newPassword = '';

    confirmPassword = '';

    userId = '';

    
 
    // Generic handler for all inputs (User, Pass, and OTP)

    handleInput(event) {

        const field = event.target.name;

        if (field === 'user') this.username = event.target.value;

        if (field === 'pass') this.password = event.target.value;

        if (field === 'otp')  this.otp = event.target.value;

        if (field === 'newPass') this.newPassword = event.target.value;

        if (field === 'confirmPass') this.confirmPassword = event.target.value;

    }
 
    // Step 1: Initial Sign-In Attempt

    async handleInitialEntry() {

        try {

            const result = await handlePortalEntry({ 

                username: this.username, 

                password: this.password 

            });
 
            this.currentState = result.state;

            this.tempSecret = result.tempSecret;

            this.qrCodeUrl = result.qrCodeUrl;
 
            // Decision Logic: Which screen comes next?

            this.showLogin = false;

            if (this.currentState === 'RESET_PASSWORD') {

                this.userId = result.userId;
                this.showResetPassword = true;

            } else if (this.currentState === 'LOGIN_VERIFY') {

                this.userId = result.userId;
                this.showVerification = true;

            } else {

                this.showRegistration = true;
            
            }

        } catch (error) {

            this.showToast('Access Denied', error.body.message, 'error');

        }

    }

    async handlePasswordReset() {

        if (this.newPassword !== this.confirmPassword) {

            this.showToast(
                'Mismatch',
                'Passwords do not match.',
                'error'
            );

            return;
        }

        try {

            const result = await finalizePortalAccess({

                state: 'RESET_PASSWORD',

                username: this.username,

                password: this.newPassword,

                otp: null,

                secret: null

            });

            if (result.qrCodeUrl) {

                this.qrCodeUrl = result.qrCodeUrl;
                this.tempSecret = result.tempSecret;

                  this.currentState = 'MFA_SETUP';

                this.showResetPassword = false;
                this.showRegistration = true;

            }

        }

        catch (error) {

            this.showToast(
                'System Error',
                'Password reset failed.',
                'error'
            );

        }
    }
 
    // Step 2: Final Verification (MFA Code Check)

    async handleVerification() {

        try {

            const isSuccessful = await finalizePortalAccess({

                state: this.currentState,

                username: this.username,

                password: this.password,

                otp: this.otp,

                secret: this.tempSecret

            });
 
            if (isSuccessful) {

                if (this.currentState === 'MFA_SETUP') {

                    this.showToast('Success', 'MFA Setup Complete. Please Login Again', 'success');

                    this.resetForm();

                    return;

                }

                if (this.currentState === 'LOGIN_VERIFY') {

                    this.showToast('Success', 'Welcome to the Portal', 'success');

                    this.showVerification = false;

                    this.loadPortalUserName();

                    this.showDashboard = true;
                }

               

            } else {

                this.showToast('Invalid Code', 'The 6-digit code did not match. Check your app.', 'warning');

            }

        } catch (error) {

            this.showToast('System Error', 'Something went wrong during verification.', 'error');

        }

    }


    loadPortalUserName() {

        getPortalUserDisplayName({

            portalUserId: this.userId

        })
        .then(result => {

            this.portalUserName = result;

        })
        .catch(error => {

            console.error(error);

        });

    }
 
    // Helper: Reset the UI

    resetForm() {

        this.showLogin = true;

        this.showRegistration = false;

        this.showVerification = false;

        this.showResetPassword = false;

        this.showDashboard = false;

        this.otp = '';

        this.password = '';

    }

     handleBack() {

        this.resetForm();

        this.username = '';
        this.password = '';
        this.otp = '';
        this.tempSecret = '';
        this.currentState = '';
        this.qrCodeUrl = '';

    }


    handleLogout() {

        // Reset UI state

        this.showDashboard = false;

        this.showLogin = true;

        this.showVerification = false;

        this.showRegistration = false;

        this.showResetPassword = false;

        // Clear session values

        this.username = '';

        this.password = '';

        this.otp = '';

        this.tempSecret = '';

        this.currentState = '';

        this.qrCodeUrl = '';

        this.userId = '';

        this.showToast(
            'Logged Out',
            'You have been logged out successfully.',
            'success'
        );

    }

    handleRefresh() {

        this.template.querySelector('c-credential-dashboard').refreshDashboard();

        this.loadPortalUserName();

    }
    
    // Helper: Standard Toast Notifications

    showToast(title, message, variant) {

        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));

    }

   

}