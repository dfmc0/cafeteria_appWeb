export interface Teacher {
  id: number;
  name: string;
  surnames: string;
  email: string | null;
  image_link: string;
  nickname: string;
  stage: {
    id: number;
    stage: string;
    colorTag: string;
  };
}
