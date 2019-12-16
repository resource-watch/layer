const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const uuidV4 = require('uuid/v4');

const { Schema } = mongoose;

const Layer = new Schema({
    _id: { type: String, default: uuidV4 },
    name: { type: String, required: true, trim: true },
    dataset: { type: String, required: true, trim: true },
    slug: {
        type: String, required: true, unique: true, trim: true
    },
    description: { type: String, required: false, trim: true },
    application: [
        { type: String, required: true, trim: true }
    ],
    iso: [
        { type: String, required: false, trim: true }
    ],
    provider: { type: String, required: false, trim: true },
    type: { type: String, required: false, trim: true },
    userId: { type: String, required: true, trim: true },
    default: { type: Boolean, required: false, default: false },
    protected: { type: Boolean, required: false, default: false },
    published: { type: Boolean, required: false, default: true },
    env: {
        type: String, required: true, default: 'production', trim: true
    },
    layerConfig: { type: Schema.Types.Mixed },
    legendConfig: { type: Schema.Types.Mixed },
    applicationConfig: { type: Schema.Types.Mixed },
    interactionConfig: { type: Schema.Types.Mixed },
    staticImageConfig: { type: Schema.Types.Mixed },
    userRole: { type: String, default: null, select: false },
    userName: { type: String, default: null, select: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

Layer.plugin(mongoosePaginate);

module.exports = mongoose.model('Layer', Layer);
