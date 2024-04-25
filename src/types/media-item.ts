export type Media = {
    name: string,
    url: string,
    type: MEDIA_TYPE,
    from: string,
    index: number,
    state: MEDIA_STATE
    meta?: MediaMetaData,
}
export type MediaMetaData = {
    //封面图
    postPic?: string
    //歌曲时长
    duration?: number
}
export enum MEDIA_STATE {
    WAITING = 0,
    PLAYING = 1,
    ENDED = 2,
    REMOVED = 3
}
export enum MEDIA_TYPE {
    AUDIO = 'audio',
    VIDEO = 'video'
}