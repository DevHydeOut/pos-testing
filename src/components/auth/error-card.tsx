import { CardWrapper } from "./card-wrapper";
import { BsExclamationTriangle } from "react-icons/bs";
 
export const ErrorCard = () => {
    return(
        <CardWrapper
            headerLabel="Oops! Something went wrong!"
            backButtonHref="/auth/login"
            backButtonLabel="Back to Login"
        >
            <div className=" w-full flex justify-center items-center ">
                <BsExclamationTriangle className="text-destructive text-5xl" />
            </div>
        </CardWrapper>
    )
}
