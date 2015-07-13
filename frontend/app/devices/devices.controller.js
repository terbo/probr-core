'use strict';

angular.module('probrApp')
    .controller('DevicesCtrl', function ($scope, Device, resourceSocket, $modal) {

        Device.query({}, function (resultObj) {
            $scope.devices = resultObj.results;
            resourceSocket.updateResource($scope, $scope.devices, 'device', 0, true);

            _.forEach($scope.devices, function (device) {
                Device.getStatus({deviceId: device.uuid, limit: 10}, function (resultObj) {
                    device.statuses = resultObj.results;
                    resourceSocket.updateResource($scope, device.statuses, 'status', 10, true, 'device', device.uuid);
                });
            })

            // a new device has been added, attach socket properly
            $scope.$watchCollection('devices', function (newValue, oldValue) {
                var diff = _.difference(newValue, oldValue);
                _.forEach(diff, function (obj) {
                    Device.getStatus({deviceId: obj.uuid, limit: 10}, function (resultObj) {
                        obj.statuses = resultObj.results;
                        resourceSocket.updateResource($scope, obj.statuses, 'status', 10, true, 'device', obj.uuid);
                    });
                });
            });

        });

        $scope.deleteDevice = function (device) {
            var modalInstance = $modal.open({
                animation: true,
                templateUrl: '/static/app/modals/deleteModalContent.html',
                controller: 'DeviceDeleteModalCtrl',
            });

            modalInstance.result.then(function () {
                var deviceResource = new Device(device);
                deviceResource.$delete(function (resultObj) {
                    $scope.devices.splice($scope.devices.indexOf(device), 1);
                });
            }, function () {

            });
        };

    })
    .controller('DeviceStatusCtrl', function ($scope, $filter, $stateParams, Status, Device, Command, CommandTemplate, resourceSocket) {

        var cmdLimit = 5;
        var statusLimit = 10;
        var deviceId = $stateParams.id;

        $scope.commands = [];
        $scope.commandTemplates = [];
        $scope.commandTemplate = {};

        Command.byDevice({deviceId: deviceId, limit: cmdLimit}, function (resultObj) {
            $scope.commands = resultObj.results;
            resourceSocket.updateResource($scope, $scope.commands, 'command', 0, true, 'device', deviceId);
        });

        CommandTemplate.get({}, function (resultObj) {
            $scope.commandTemplates = resultObj.results;
        });

        Device.getStatus({deviceId: deviceId, limit: statusLimit}, function (resultObj) {
            $scope.statuses = resultObj.results;
            resourceSocket.updateResource($scope, $scope.statuses, 'status', statusLimit, true, 'device', deviceId);
        });

        Device.get({deviceId: deviceId}, function (resultObj) {
            $scope.device = resultObj;
        });

        $scope.killCmd = function (uuid) {
            new Command({execute: "kill $(<commands/"+uuid+".pid)", device: $scope.device.uuid}).$save();
        };

        $scope.executeCommand = function () {
            new Command({execute: $scope.commandTemplate.execute, device: $scope.device.uuid}).$save(function (result) {
                $scope.commandTemplate = {};
            });
        };

        $scope.saveCommandTemplate = function () {
            if(_.has($scope.commandTemplate, 'uuid')){
                CommandTemplate.update({
                    name: $scope.commandTemplate.name,
                    execute: $scope.commandTemplate.execute,
                    uuid: $scope.commandTemplate.uuid,
                    tags: []
                }, function (resultObj) {
                    $scope.commandTemplate = resultObj;
                });
            }else{
                new CommandTemplate({
                    name: $scope.commandTemplate.name,
                    execute: $scope.commandTemplate.execute,
                    uuid: $scope.commandTemplate.uuid,
                    tags: []
                }).$save(function (resultObj) {
                    $scope.commandTemplate = resultObj;
                    $scope.commandTemplates.push(resultObj);
                });
            }
        };

        $scope.deleteCommandTemplate = function () {
            CommandTemplate.delete({commandTemplateId:$scope.commandTemplate.uuid}, function (resultObj) {
                $scope.commandTemplates = $filter('filter')($scope.commandTemplates, {uuid: '!'+$scope.commandTemplate.uuid});
                $scope.commandTemplate ={};
            });
        }

        var timeout;
        $scope.onlineIndicator = function (statuses) {
            var timeoutInterval = 60000;
            if (statuses !== undefined && statuses.length > 0 && new Date(statuses[statuses.length - 1].creation_timestamp) > new Date(new Date().getTime() - timeoutInterval)) {

                var tmpDate = statuses[statuses.length - 1].creation_timestamp;
                clearTimeout(timeout);
                timeout = setTimeout(function () {
                    // haven't gotten new updates in 15 seconds
                    if (tmpDate === statuses[statuses.length - 1].creation_timestamp) {
                        $scope.$apply(function () {
                            statuses[statuses.length - 1].creation_timestamp = new Date(new Date().getTime() - timeoutInterval).toISOString(); // change to force offline status
                        });
                    }
                }, timeoutInterval);

                return "online";
            }

            return "offline";
        };

    })
    .controller('DeviceAddCtrl', function($scope, Device) {
        $scope.deviceForm = {};
        $scope.step = 1;

        $scope.submitDevice = function () {
            $scope.device = new Device($scope.deviceForm, function (resultObj) {
                $scope.device = resultObj;
                $scope.step = 2;
            });
        };

    })
    .controller('DeviceDeleteModalCtrl', function ($scope, $modalInstance) {
        $scope.ok = function () {
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });
;
;
