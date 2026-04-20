import { gql } from 'graphql-tag';

const commonTypes = `
    enum HomeCarouselLinkType {
        internal
        external
    }

    enum HomeCarouselSlideLayout {
        split_left
        split_right
        full_image
    }

    enum HomeCarouselBadgeVariant {
        solid
        outline
        pill
    }

    enum HomeCarouselTextTheme {
        dark
        light
    }

    enum HomeCarouselTransitionEffect {
        fade
        slide
        zoom
    }

    type HomeCarouselSlide implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        title: String!
        subtitle: String
        description: String
        primaryButtonText: String
        primaryButtonUrl: String
        secondaryButtonText: String
        secondaryButtonUrl: String
        linkType: HomeCarouselLinkType!
        openInNewTab: Boolean!
        isActive: Boolean!
        sortOrder: Int!
        altText: String
        layout: HomeCarouselSlideLayout!
        textTheme: HomeCarouselTextTheme!
        badgeText: String
        badgeColor: String
        badgeVariant: HomeCarouselBadgeVariant!
        desktopAsset: Asset
        desktopAssetId: ID
        mobileAsset: Asset
        mobileAssetId: ID
    }

    type HomeCarouselSettings {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        transitionEffect: HomeCarouselTransitionEffect!
        autoplayEnabled: Boolean!
        autoplayInterval: Int!
        showArrows: Boolean!
        showDots: Boolean!
    }
`;

export const homeCarouselAdminApiExtensions = gql`
    ${commonTypes}

    type HomeCarouselSlideList implements PaginatedList {
        items: [HomeCarouselSlide!]!
        totalItems: Int!
    }

    input CreateHomeCarouselSlideInput {
        title: String!
        subtitle: String
        description: String
        primaryButtonText: String
        primaryButtonUrl: String
        secondaryButtonText: String
        secondaryButtonUrl: String
        linkType: HomeCarouselLinkType
        openInNewTab: Boolean
        isActive: Boolean
        sortOrder: Int
        altText: String
        layout: HomeCarouselSlideLayout
        textTheme: HomeCarouselTextTheme
        badgeText: String
        badgeColor: String
        badgeVariant: HomeCarouselBadgeVariant
        desktopAssetId: ID
        mobileAssetId: ID
    }

    input UpdateHomeCarouselSlideInput {
        id: ID!
        title: String
        subtitle: String
        description: String
        primaryButtonText: String
        primaryButtonUrl: String
        secondaryButtonText: String
        secondaryButtonUrl: String
        linkType: HomeCarouselLinkType
        openInNewTab: Boolean
        isActive: Boolean
        sortOrder: Int
        altText: String
        layout: HomeCarouselSlideLayout
        textTheme: HomeCarouselTextTheme
        badgeText: String
        badgeColor: String
        badgeVariant: HomeCarouselBadgeVariant
        desktopAssetId: ID
        mobileAssetId: ID
    }

    input UpdateHomeCarouselSettingsInput {
        transitionEffect: HomeCarouselTransitionEffect
        autoplayEnabled: Boolean
        autoplayInterval: Int
        showArrows: Boolean
        showDots: Boolean
    }

    input HomeCarouselSlideListOptions {
        skip: Int
        take: Int
        sort: HomeCarouselSlideSortParameter
        filter: HomeCarouselSlideFilterParameter
    }

    input HomeCarouselSlideSortParameter {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        title: SortOrder
        sortOrder: SortOrder
    }

    input HomeCarouselSlideFilterParameter {
        id: IDOperators
        title: StringOperators
        isActive: BooleanOperators
        sortOrder: NumberOperators
    }

    extend type Query {
        homeCarouselSlide(id: ID!): HomeCarouselSlide
        homeCarouselSlides(options: HomeCarouselSlideListOptions): HomeCarouselSlideList!
        homeCarouselSettings: HomeCarouselSettings!
    }

    extend type Mutation {
        createHomeCarouselSlide(input: CreateHomeCarouselSlideInput!): HomeCarouselSlide!
        updateHomeCarouselSlide(input: UpdateHomeCarouselSlideInput!): HomeCarouselSlide!
        deleteHomeCarouselSlide(id: ID!): DeletionResponse!
        reorderHomeCarouselSlides(orderedIds: [ID!]!): [HomeCarouselSlide!]!
        updateHomeCarouselSettings(input: UpdateHomeCarouselSettingsInput!): HomeCarouselSettings!
    }
`;

export const homeCarouselShopApiExtensions = gql`
    ${commonTypes}

    type HomeCarouselConfig {
        settings: HomeCarouselSettings!
        slides: [HomeCarouselSlide!]!
    }

    extend type Query {
        activeHomeCarouselSlides: [HomeCarouselSlide!]!
        homeCarouselConfig: HomeCarouselConfig!
    }
`;
