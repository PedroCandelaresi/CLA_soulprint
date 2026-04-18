import { gql } from 'graphql-tag';

const badgeTypeDefs = `
    type Badge implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        code: String!
        enabled: Boolean!
        priority: Int!
        backgroundColor: String
        textColor: String
        expiresAt: DateTime
        featuredAsset: Asset
        featuredAssetId: ID
        templateId: ID
        templateParams: String
        renderedSvg: String
    }
`;

export const badgeAdminApiExtensions = gql`
    ${badgeTypeDefs}

    type BadgeTemplate implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        svgTemplate: String!
        defaultParams: String
    }

    type BadgeList implements PaginatedList {
        items: [Badge!]!
        totalItems: Int!
    }

    input CreateBadgeInput {
        name: String!
        code: String!
        enabled: Boolean
        priority: Int
        backgroundColor: String
        textColor: String
        expiresAt: DateTime
        featuredAssetId: ID
        templateId: ID
        templateParams: String
    }

    input UpdateBadgeInput {
        id: ID!
        name: String
        code: String
        enabled: Boolean
        priority: Int
        backgroundColor: String
        textColor: String
        expiresAt: DateTime
        featuredAssetId: ID
        templateId: ID
        templateParams: String
    }

    input CreateBadgeTemplateInput {
        name: String!
        svgTemplate: String!
        defaultParams: String
    }

    input UpdateBadgeTemplateInput {
        id: ID!
        name: String
        svgTemplate: String
        defaultParams: String
    }

    input BadgeListOptions {
        skip: Int
        take: Int
        sort: BadgeSortParameter
        filter: BadgeFilterParameter
    }

    input BadgeSortParameter {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        name: SortOrder
        code: SortOrder
        priority: SortOrder
        expiresAt: SortOrder
    }

    input BadgeFilterParameter {
        id: IDOperators
        createdAt: DateOperators
        updatedAt: DateOperators
        name: StringOperators
        code: StringOperators
        enabled: BooleanOperators
        priority: NumberOperators
        expiresAt: DateOperators
    }

    extend type Query {
        badge(id: ID!): Badge
        badges(options: BadgeListOptions): BadgeList!
        badgeTemplate(id: ID!): BadgeTemplate
        badgeTemplates: [BadgeTemplate!]!
    }

    extend type Mutation {
        createBadge(input: CreateBadgeInput!): Badge!
        updateBadge(input: UpdateBadgeInput!): Badge!
        deleteBadge(id: ID!): DeletionResponse!
        createBadgeTemplate(input: CreateBadgeTemplateInput!): BadgeTemplate!
        updateBadgeTemplate(input: UpdateBadgeTemplateInput!): BadgeTemplate!
        deleteBadgeTemplate(id: ID!): DeletionResponse!
    }
`;

export const badgeShopApiExtensions = gql`
    ${badgeTypeDefs}
`;
