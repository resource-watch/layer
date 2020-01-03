const nock = require('nock');
const intersection = require('lodash/intersection');

const createMockUser = (users) => {
    nock(process.env.CT_URL)
        .post(
            '/auth/user/find-by-ids',
            (body) => intersection(body.ids, users.map((e) => e._id.toString())).length === body.ids.length
        )
        .query(() => true)
        .reply(200, { data: users });
};

const createMockUserRole = (role, userID) => nock(process.env.CT_URL)
    .get(`/auth/user/ids/${role}`)
    .reply(200, { data: [userID] });

module.exports = {
    createMockUser,
    createMockUserRole
};
