"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class QueryBuilder {
    constructor(modelQuery, query) {
        this.modelQuery = modelQuery;
        this.query = query;
    }
    search(searchableFields) {
        var _a;
        const searchTerm = (_a = this.query) === null || _a === void 0 ? void 0 : _a.search;
        if (searchTerm) {
            this.modelQuery = this.modelQuery.find({
                $or: [
                    // Search through the regular fields like name, type, and brand
                    ...searchableFields.map((field) => ({
                        [field]: { $regex: searchTerm, $options: "i" },
                    })),
                    // Search through the symptoms array
                    {
                        simptoms: {
                            $elemMatch: { $regex: searchTerm, $options: "i" },
                        },
                    },
                ],
            });
        }
        return this;
    }
    filter() {
        const queryObj = Object.assign({}, this.query);
        const excludeFields = ["search", "searchTerm", "sort", "limit", "page", "fields"];
        excludeFields.forEach((el) => delete queryObj[el]);
        // Handle prescriptionRequired boolean filter
        if (queryObj.prescriptionRequired !== undefined) {
            // Convert string "true"/"false" to boolean
            queryObj.prescriptionRequired =
                String(queryObj.prescriptionRequired).toLowerCase() === "true";
        }
        // Only apply filter if there are additional conditions
        if (Object.keys(queryObj).length > 0) {
            const existingFilter = this.modelQuery.getFilter();
            this.modelQuery = this.modelQuery.find(Object.assign(Object.assign({}, existingFilter), queryObj));
        }
        return this;
    }
    sort() {
        var _a, _b;
        const sort = ((_b = (_a = this.query) === null || _a === void 0 ? void 0 : _a.sort) === null || _b === void 0 ? void 0 : _b.split(",").join(" ")) || "-createdAt";
        this.modelQuery = this.modelQuery.sort(sort);
        return this;
    }
    paginate() {
        var _a, _b;
        const page = ((_a = this.query) === null || _a === void 0 ? void 0 : _a.page) ? Number(this.query.page) : 1; // Default page = 1
        const limit = ((_b = this.query) === null || _b === void 0 ? void 0 : _b.limit) ? Number(this.query.limit) : null; // Default to no limit
        if (limit) {
            const skip = (page - 1) * limit;
            this.modelQuery = this.modelQuery.skip(skip).limit(limit);
        }
        return this;
    }
    fields() {
        var _a, _b;
        const fields = ((_b = (_a = this.query) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b.split(",").join(" ")) || "-__v";
        this.modelQuery = this.modelQuery.select(fields);
        return this;
    }
    countTotal() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const totalQueries = this.modelQuery.getFilter();
            const total = yield this.modelQuery.model.countDocuments(totalQueries);
            const page = Number((_a = this.query) === null || _a === void 0 ? void 0 : _a.page) || 1;
            const limit = Number((_b = this.query) === null || _b === void 0 ? void 0 : _b.limit) || 10;
            const totalPage = Math.ceil(total / limit);
            return { page, limit, total, totalPage };
        });
    }
}
exports.default = QueryBuilder;
