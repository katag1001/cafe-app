import AddCafe from "../components/cafes/add_cafes/AddCafe";

function NewCafe({ currentUser, authLoading }) {
  return (
    <main className="container">
      {authLoading ? <p>Loading...</p> : <AddCafe currentUser={currentUser} />}
    </main>
  )
}

export default NewCafe

