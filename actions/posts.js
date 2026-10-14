"use server";

import { storePost } from "@/lib/posts";
import { InvalidImageError, saveImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updatePostLikeStatus } from "@/lib/posts";
export async function createPost(prevState, formData) {


    const title = formData.get("title");
    const image = formData.get("image");
    const content = formData.get("content");


    let errors = [];

    if(!title || title.trim().length ===0){

      errors.push("Title is required");

    }

    if(!content || content.trim().length ===0){
      errors.push("Content is required");
    }

    // An empty file input still submits a File object, so check its size
    if(!image || image.size === 0){
      errors.push("Image is required");

    }

    if(errors.length > 0){
     return {errors};
    }

    let imageUrl;

    try {
      imageUrl = await saveImage(image);
    } catch (error) {
      if (error instanceof InvalidImageError) {
        return { errors: [error.message] };
      }
      console.error(error);
      return { errors: ["Image upload failed, please try again later"] };
    }

    await storePost({
      title,
      imageUrl,
      content,
      userId: 1,
    });

    // Feed and home page are cached; refresh them so the new post shows up
    revalidatePath('/', 'layout');
    redirect('/feed');

    


  }


  export async function togglePostLikeStatus(postId){

   await updatePostLikeStatus(postId, 2);

   revalidatePath('/','layout');

  }