(function(define) {
    'use strict';

    define(['jquery'],
        function($) {
            return function(messages) {
                $('#data-sharing').submit(function(event) {
                    var $dataSharingConsentCheckbox = $('#register-data_sharing_consent');
                    var warningMessage = messages[$dataSharingConsentCheckbox.data('consent')];

                    if (!$dataSharingConsentCheckbox.is(':checked') && warningMessage) {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm(warningMessage)) {
                            event.preventDefault();
                        }
                    }
                });
            };
        });
}).call(this, define || RequireJS.define);
