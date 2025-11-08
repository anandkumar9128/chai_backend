const asyncHandler = (requestHandler) =>{
    // return (req, res, next) => {
    //     Promise.resolve(requestHandler(req, res, next)).catch(err => next(err));
    // }

    //alternate way to write the same code
    return async (req, res, next) => {
        try {
            await requestHandler(req, res, next);
        } catch (err) {
            next(err);
        }   
    };
};

export {asyncHandler};