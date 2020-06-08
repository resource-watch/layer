const USERS = {
    USER: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'USER',
        provider: 'local',
        email: 'user@control-tower.org',
        name: 'test user',
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
        id: '1a10d7c6e0a37126611fd7a5',
        role: 'MANAGER',
        provider: 'local',
        email: 'user@control-tower.org',
        name: 'test manager',
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
        id: '1a10d7c6e0a37126611fd7a6',
        role: 'ADMIN',
        provider: 'local',
        email: 'user@control-tower.org',
        name: 'test admin',
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
    SUPERADMIN: {
        id: '1a10d7c6e0a37126601fd7a6',
        role: 'SUPERADMIN',
        provider: 'local',
        email: 'user@control-tower.org',
        name: 'test super admin',
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
        createdAt: '2016-09-14'
    }
};

const LAYER = {
    name: `Carto DB Layer`,
    application: ['rw'],
};

module.exports = {
    USERS,
    LAYER
};
