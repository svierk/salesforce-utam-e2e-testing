import { LightningElement, api, track } from 'lwc';

import { refreshApex } from '@salesforce/apex';
import { wire } from 'lwc';

import loginToOrg
from '@salesforce/apex/SalesforceLoginService.loginToOrg';

import getSharedUsers
from '@salesforce/apex/ProjectCredentialsService.getSharedUsers';

import updateCredentialSharing
from '@salesforce/apex/ProjectCredentialsService.updateCredentialSharing';

import getUserCredentials
from '@salesforce/apex/CredentialDashboardController.getUserCredentials';

import createCredential
from '@salesforce/apex/ProjectCredentialsService.createCredential';

import updateCredential
from '@salesforce/apex/ProjectCredentialsService.updateCredential';

import getPortalUsers
from '@salesforce/apex/CredentialDashboardController.getPortalUsers';

import revealPassword
from '@salesforce/apex/CredentialDashboardController.revealPassword';

import deleteCredential
from '@salesforce/apex/ProjectCredentialsService.deleteCredential';

import { ShowToastEvent }
from 'lightning/platformShowToastEvent';


export default class CredentialDashboard extends LightningElement {

    @api portalUserId;

    @track credentialData = [];

    @track showModal = false;

    @track portalUsers = [];

    @track initialized = false;


    projectName;

    orgType;

    orgUsername;

    orgPassword;

    selectedCredentialId;

    wiredCredentialResult;

    selectedUsers = [];

    modalTitle = 'New Credential';

    pressedCredentialId = null;


    columns = [

        { label: 'Project Name', fieldName: 'projectName' },

        { label: 'Org Type', fieldName: 'orgType' },

        // // {
        // //     type: 'button',
        // //     typeAttributes: {

        // //         label: {fieldName: 'revealLabel'},
        // //         name: 'reveal'
        // //     }
        // // },

        // {
        //     type: 'button-icon',
        //     fixedWidth: 80,
        //     typeAttributes: {
        //         iconName: 'utility:preview',
        //         name: 'reveal',
        //         alternativeText: 'Click to view password',
        //         title: 'Click to view password',
        //         variant: 'bare'
        //     },
        //     cellAttributes: {
        //         alignment: 'center'
        //     }
        // },

        // {
        //     type: 'button',
        //     typeAttributes: {
        //         label: 'Copy',
        //         name: 'copy',
        //         variant: 'brand-outline'
        //     },
        //     cellAttributes: {
        //         alignment: 'center'
        //     }
        // },

        { label: 'Access', fieldName: 'accessLevel' },

        {
            type: 'button',
            typeAttributes: {

                label: 'Login',
                name: 'login',
                variant: 'brand'

            },
            cellAttributes: {

                alignment: 'center'

            }
        },

        {
            type: 'button-icon',
            fixedWidth: 80,
            typeAttributes: {
                iconName : 'utility:edit',
                name: 'edit',
                title: 'Edit Credential',
                variant: 'bare',
                disabled: { fieldName: 'disableEdit' }
            },
            cellAttributes: {
                alignment: 'center'
            }
        },
        {
            type: 'button-icon',
            fixedWidth: 80,
            typeAttributes: {

                iconName: 'utility:delete',
                name: 'delete',
                title: 'Delete Credential',
                variant: 'bare',
                disabled: { fieldName: 'disableEdit' }

            },
            cellAttributes: {
                alignment: 'center'
            }
        }

    ];


    orgTypeOptions = [

        { label: 'Production', value: 'Production' },

        { label: 'Sandbox', value: 'Sandbox' },

        { label: 'Developer', value: 'Developer' }

    ];

    renderedCallback() {

        if (!this.portalUserId || this.initialized) {

            return;

        }

        this.initialized = true;

        this.loadPortalUsers();

    }



    @wire(getUserCredentials, { portalUserId: '$portalUserId' })
    wiredCredentials(result) {

        this.wiredCredentialResult = result;

        if (result.data) {

            this.credentialData = result.data.map(row => ({
                ...row,
                orgPassword: '••••••••',
                disableEdit: row.accessLevel !== 'Edit',
                revealLabel: 'Reveal'

            }));

        }

    }

    refreshDashboard() {

        if (this.wiredCredentialResult) {

            refreshApex(this.wiredCredentialResult);

        }

    }


    loadPortalUsers() {

        if (!this.portalUserId) {

            console.error('Portal user Id missing');

            return;

        }

    

        getPortalUsers({
            portalUserId: String(this.portalUserId)
        })

        .then(result => {

            this.portalUsers = result;

        });

    }


    openModal() {

        this.resetModalFields();

        this.modalTitle = 'New Credential';

        this.showModal = true;

    }


    closeModal() {

        this.selectedUsers = [];

        this.resetModalFields();

        this.modalTitle = 'New Credential';

        this.showModal = false;

    }


    handleInput(event) {

        this[event.target.name] = event.target.value;

    }


    handleUserSelection(event) {

        this.selectedUsers = event.detail.value;

    }


    saveCredential() {

        if (this.selectedCredentialId) {

            this.updateCredential();

        } else {

            this.createNewCredential();

        }

    }

    resetModalFields() {

        this.projectName = '';
        this.orgType = '';
        this.orgUsername = '';
        this.orgPassword = '';
        this.selectedUsers = [];
        this.selectedCredentialId = null;

    }

    createNewCredential(){

        if(!this.portalUserId) {

            this.showToast(
                'Error',
                'User context missing.',
                'error'
            );

            return;
        }
        createCredential({

            projectName: this.projectName,

            orgType: this.orgType,

            orgUsername: this.orgUsername,

            orgPassword: this.orgPassword,

            ownerUserId: this.portalUserId,

            sharedUserIds: this.selectedUsers

        })

        .then(() => {

            this.showToast('Success', 'Credential created', 'success');

            this.resetModalFields();

            this.showModal = false;

            return refreshApex(this.wiredCredentialResult);

        })

        .catch(error => {

            this.showToast('Error', error.body.message, 'error');

        });
    }

    updateCredential() {

        updateCredential({

            credentialId: this.selectedCredentialId,

            projectName: this.projectName,

            orgType: this.orgType,

            orgUsername: this.orgUsername,

            orgPassword: this.orgPassword,

            portalUserId: this.portalUserId

        })

        .then(() => {

            return updateCredentialSharing({

                credentialId: this.selectedCredentialId,

                selectedUsers: this.selectedUsers,

                ownerUserId: this.portalUserId

            });

        })

        .then(() => {

            this.showToast('Success', 'Credential Updated Successfully', 'success');

            this.selectedUsers = [];

            return refreshApex(this.wiredCredentialResult)
            .then(() =>{

                this.resetModalFields();

                this.showModal = false;

            });

        });

    }

    handleRowAction(event) {

        const actionName = event.detail.action.name;

        const row = event.detail.row;

        if (actionName === 'edit') {

            this.openEditModal(row);

        }
        
        if (actionName === 'login') {

            this.handleOrgLogin(row);

        }

        // if (actionName === 'reveal') {

        //     this.handleReveal(row);

        // }

        // if (actionName === 'peek') {

        //     this.startPeek(row);

        // }

        // if (actionName === 'copy') {

        //     this.handleCopy(row);

        // }

        if (actionName === 'delete') {
            this.handleDelete(row);
        }


    }

    maskPassword(id) {

        this.credentialData =
        this.credentialData.map(item => {

            if (item.credentialId === id) {

                return {

                    ...item,
                    passwordDisplay: '••••••••',
                    revealLabel: 'Reveal'

                };

            }

            return item;

        });

    }

    // startPeek(row) {

    //     if (this.pressedCredentialId) {
    //         return;
    //     }

    //     this.pressedCredentialId = row.credentialId;

    //     revealPassword({

    //         credentialId: row.credentialId,
    //         portalUserId: this.portalUserId

    //     })
    //     .then(password => {

    //         this.updatePasswordDisplay(
    //             row.credentialId,
    //             password
    //         );

    //     });

    //     window.addEventListener(
    //         'mouseup',
    //         this.stopPeek.bind(this),
    //         true
    //     );

    // }

    // stopPeek() {

    //     if (!this.pressedCredentialId) {
    //         return;
    //     }

    //     this.updatePasswordDisplay(
    //         this.pressedCredentialId,
    //         '••••••••'
    //     );

    //     this.pressedCredentialId = null;

    //     window.removeEventListener(
    //         'mouseup',
    //         this.stopPeek,
    //         true
    //     );

    // }

    // updatePasswordDisplay(id, password) {

    //     this.credentialData = this.credentialData.map(item => {

    //         if (item.credentialId === id) {

    //             return {

    //                 ...item,
    //                 orgPassword: password

    //             };

    //         }

    //         return item;

    //     });

    // }

    // handlePeek(row) {

    //     revealPassword({

    //         credentialId: row.credentialId,
    //         portalUserId: this.portalUserId

    //     })
    //     .then(password => {

    //         console.log('PASSWORD FROM APEX:', password);

    //         if (!password) return;

    //         const updatedData = this.credentialData.map(item => {

    //             if (item.credentialId === row.credentialId) {

    //                 return {

    //                     ...item,
    //                     orgPassword: password

    //                 };

    //             }

    //             return item;

    //         });

    //         this.credentialData = updatedData;

    //         setTimeout(() => {

    //             const resetData = this.credentialData.map(item => {

    //                 if (item.credentialId === row.credentialId) {

    //                     return {

    //                         ...item,
    //                         orgPassword: '••••••••'

    //                     };

    //                 }

    //                 return item;

    //             });

    //             this.credentialData = resetData;

    //         }, 3000);

    //     })
    //     .catch(error => {

    //         console.error(error);

    //     });

    // }

    // handleReveal(row) {

    //     const credentialId = row.credentialId;

    //     const index = this.credentialData.findIndex(
    //         item => item.credentialId === credentialId
    //     );

    //     if (index === -1) {
    //         return;
    //     }

    //     const currentRow = this.credentialData[index];

    //     // Toggle back to masked

    //     if (currentRow.revealLabel === 'Hide') {

    //         const updatedRow = {
    //             ...currentRow,
    //             orgPassword: '••••••••',
    //             revealLabel: 'Reveal'
    //         };

    //         this.credentialData = [
    //             ...this.credentialData.slice(0, index),
    //             updatedRow,
    //             ...this.credentialData.slice(index + 1)
    //         ];

    //         return;
    //     }

    //     // Fetch real password from Apex

    //     revealPassword({

    //         credentialId,
    //         portalUserId: this.portalUserId

    //     })
    //     .then(password => {

    //         console.log('PASSWORD FROM APEX:', password);

    //         const updatedRow = {

    //             ...currentRow,

    //             orgPassword: password,

    //             revealLabel: 'Hide'

    //         };

    //         this.credentialData = [

    //             ...this.credentialData.slice(0, index),

    //             updatedRow,

    //             ...this.credentialData.slice(index + 1)

    //         ];

    //     })
    //     .catch(error => {

    //         this.showToast(

    //             'Access Denied',

    //             error.body.message,

    //             'error'

    //         );

    //     });

    // }

    // handleCopy(row) {

    //     const passwordToCopy = row.passwordDisplay;

    //     if (!passwordToCopy || passwordToCopy === '••••••••') {

    //         this.showToast(
    //             'Error',
    //             'Reveal password before copying.',
    //             'error'
    //         );

    //         return;
    //     }

    //     navigator.clipboard.writeText(passwordToCopy)
    //     .then(() => {

    //         this.showToast(
    //             'Copied',
    //             'Password copied to clipboard.',
    //             'success'
    //         );

    //     })
    //     .catch(() => {

    //         this.showToast(
    //             'Error',
    //             'Copy failed.',
    //             'error'
    //         );

    //     });

    // }

    // handleCopy(row) {

    //     revealPassword({

    //         credentialId: row.credentialId,
    //         portalUserId: this.portalUserId

    //     })
    //     .then(password => {

    //         navigator.clipboard.writeText(password);

    //         this.showToast(
    //             'Success',
    //             'Password copied to clipboard',
    //             'success'
    //         );

    //     })
    //     .catch(error => {

    //         this.showToast(
    //             'Error',
    //             error.body.message,
    //             'error'
    //         );

    //     });

    // }

    handleOrgLogin(row) {

        loginToOrg({

            credentialId: row.credentialId,
            portalUserId: this.portalUserId

        })

        .then(url => {

            window.open(url, '_blank');

        })

        .catch(error => {

            this.showToast(
                'Error',
                error.body.message,
                'error'
            );
        });
    }

    handleDelete(row) {

        deleteCredential({

            credentialId: row.credentialId,
            portalUserId: this.portalUserId

        })
        .then(() => {

            this.showToast(
                'Deleted',
                'Credential removed successfully',
                'success'
            );

            return refreshApex(this.wiredCredentialResult);

        })
        .catch(error => {

            this.showToast(
                'Error',
                error.body.message,
                'error'
            );

        });

    }

    openEditModal(row) {

        this.selectedCredentialId = row.credentialId;

        this.projectName = row.projectName;

        this.orgType = row.orgType;

        this.orgUsername = row.orgUsername;

        this.orgPassword = '';

        this.modalTitle = 'Edit Credential';


        // STEP 1 — reload user list
        getPortalUsers({ portalUserId: this.portalUserId })

        .then(users => {

            this.portalUsers = users;


            // STEP 2 — reload selected users
            return getSharedUsers({

                credentialId: row.credentialId

            });

        })

        .then(selected => {

            this.selectedUsers = [...selected];

            // STEP 3 — open modal AFTER data ready
            this.showModal = true;

        });

    }


    showToast(title, message, variant) {

        this.dispatchEvent(

            new ShowToastEvent({

                title,

                message,

                variant

            })

        );

    }

}