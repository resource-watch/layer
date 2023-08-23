const nock = require('nock');
const intersection = require('lodash/intersection');

const createMockUser = (users) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post(
            '/auth/user/find-by-ids',
            (body) => intersection(body.ids, users.map((e) => e.id.toString())).length === body.ids.length
        )
        .reply(200, { data: users });
};

const createMockUserRole = (role, userID) => nock(process.env.GATEWAY_URL, {
    reqheaders: {
        'x-api-key': 'api-key-test',
    }
})
    .get(`/auth/user/ids/${role}`)
    .reply(200, { data: [userID] });

const createMockVocabulary = (mockVocabulary, datasetId, layerId, query = {}) => nock(process.env.GATEWAY_URL, {
    reqheaders: {
        'x-api-key': 'api-key-test',
    }
})
    .get(`/v1/dataset/${datasetId}/layer/${layerId}/vocabulary`)
    .query(query)
    .reply(200, {
        data: mockVocabulary,
    });

module.exports = {
    createMockUser,
    createMockUserRole,
    createMockVocabulary
};
