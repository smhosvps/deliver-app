import { api } from "../../api/apiSlice";

export const bibleApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getBible: builder.query({
            query: () => 'scriptures'
        }),
        getBibleScripture: builder.query({
            query: (bookName) => `scriptures/${bookName}`,
        }),
        getChapter: builder.query({
            query: ({ bookName, chapterNumber }) => `scriptures/${bookName}/${chapterNumber}`,
        }),
    }),
    overrideExisting: false, // Prevents errors if already injected
});
 
export const {
    useGetChapterQuery,
    useGetBibleQuery,
    useGetBibleScriptureQuery
} = bibleApi;

