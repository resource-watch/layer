const ROLES = {
    USER: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'USER',
        provider: 'local',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    MANAGER: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'MANAGER',
        provider: 'local',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    ADMIN: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'ADMIN',
        provider: 'local',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    MICROSERVICE: {
        id: 'microservice',
        role: 'MICROSERVICE',
        provider: 'local',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    }
};

const LAYER = {
    name: `Carto DB Layer`,
    application: ['rw'],
};

const WRONG_DATAS = [
    { expectedError: '- name: can not be empty - ', data: { name: 123 } },
    { expectedError: '- application: must be a non-empty array - ', data: { application: {} } },
    { expectedError: '- description: must be a string - ', data: { description: 123 } },
    { expectedError: '- iso: must be an array - ', data: { iso: {} } },
    { expectedError: '- provider: must be a string - ', data: { provider: 123 } },
    { expectedError: '- type: must be a string - ', data: { type: 123 } },
    { expectedError: '- env: must be a string - ', data: { env: 123 } },
    { expectedError: '- layerConfig: must be an object - ', data: { layerConfig: [] } },
    { expectedError: '- legendConfig: must be an object - ', data: { legendConfig: [] } },
    { expectedError: '- interactionConfig: must be an object - ', data: { interactionConfig: [] } },
    { expectedError: '- applicationConfig: must be an object - ', data: { applicationConfig: [] } },
    { expectedError: '- staticImageConfig: must be an object - ', data: { staticImageConfig: [] } }
];

const LAYER_TO_UPDATE = {
    name: 'test update 123',
    application: ['rw'],
    description: 'test description',
    iso: ['123'],
    provider: 'test prodiver',
    default: true,
    published: true,
    layerConfig: { test: true },
    legendConfig: { test: true },
    interactionConfig: { test: true },
    applicationConfig: { test: true },
    staticImageConfig: { test: true }
};

module.exports = {
    ROLES,
    WRONG_DATAS,
    LAYER_TO_UPDATE,
    LAYER
};
