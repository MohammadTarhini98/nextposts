'use client';

import PostForm from "@/components/postform";
import { createPost } from "@/actions/posts";
export default function NewPostPage() {
  // useFormState passes the previous state as the first argument
  

  return (
    <PostForm action={createPost} />
  );

}
